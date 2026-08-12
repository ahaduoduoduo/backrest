package openlistclient

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/garethgeorge/backrest/internal/env"
)

const (
	usagePath       = "/restic/_usage"
	releaseTaskPath = "/restic/_tasks/release"
	bytesPerGiB     = 1024 * 1024 * 1024
)

var httpClient = &http.Client{Timeout: 10 * time.Second}

type ReleaseRequest struct {
	Repository      string `json:"repository"`
	TaskID          string `json:"task_id"`
	DailyLimitBytes int64  `json:"daily_limit_bytes"`
	Weight          int32  `json:"weight"`
}

type usageSnapshot struct {
	DayBytes     int64             `json:"day_bytes"`
	DayLimit     int64             `json:"day_limit"`
	MonthBytes   int64             `json:"month_bytes"`
	MonthLimit   int64             `json:"month_limit"`
	Repositories []repositoryUsage `json:"repositories"`
}

type repositoryUsage struct {
	Name       string      `json:"name"`
	DayBytes   int64       `json:"day_bytes"`
	DayLimit   int64       `json:"day_limit"`
	MonthBytes int64       `json:"month_bytes"`
	MonthLimit int64       `json:"month_limit"`
	Tasks      []taskUsage `json:"tasks"`
}

type taskUsage struct {
	ID              string `json:"id"`
	DayBytes        int64  `json:"day_bytes"`
	DayLimit        int64  `json:"day_limit"`
	Released        bool   `json:"released"`
	ReleasedAtBytes int64  `json:"released_at_bytes"`
}

func UsageURL() string {
	return strings.TrimRight(env.OpenListURL(), "/") + usagePath
}

func Configured() bool {
	return env.OpenListURL() != ""
}

func EncodeTaskUsername(baseUsername, taskID string, dailyUploadGiB float64, weight int32) string {
	limitBytes := DailyLimitBytes(dailyUploadGiB)
	if baseUsername == "" || taskID == "" || limitBytes <= 0 {
		return baseUsername
	}
	if weight <= 0 {
		weight = 1
	}
	encodedTask := base64.RawURLEncoding.EncodeToString([]byte(taskID))
	return strings.Join([]string{
		baseUsername,
		encodedTask,
		strconv.FormatInt(limitBytes, 10),
		strconv.FormatInt(int64(weight), 10),
	}, "~")
}

func DailyLimitBytes(dailyUploadGiB float64) int64 {
	if dailyUploadGiB <= 0 {
		return 0
	}
	return int64(math.Round(dailyUploadGiB * bytesPerGiB))
}

func RepositoryName(resticURI string) string {
	rawURL := strings.TrimPrefix(resticURI, "rest:")
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	for idx, part := range parts {
		if part == "restic" && idx+1 < len(parts) {
			name, err := url.PathUnescape(parts[idx+1])
			if err == nil {
				return name
			}
		}
	}
	return ""
}

// UploadCapacityAvailable reads OpenList's local traffic counters. It does not
// enumerate the Restic repository or contact the storage provider.
func UploadCapacityAvailable(ctx context.Context, repository, taskID string, taskDailyLimit int64) (bool, error) {
	if !Configured() || repository == "" {
		return true, nil
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, UsageURL(), nil)
	if err != nil {
		return true, fmt.Errorf("create OpenList usage request: %w", err)
	}
	request.SetBasicAuth(env.OpenListUsername(), env.OpenListPassword())
	response, err := httpClient.Do(request)
	if err != nil {
		return true, fmt.Errorf("read OpenList usage: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return true, fmt.Errorf("read OpenList usage: status %s", response.Status)
	}
	var usage usageSnapshot
	if err := json.NewDecoder(response.Body).Decode(&usage); err != nil {
		return true, fmt.Errorf("decode OpenList usage: %w", err)
	}
	if limitReached(usage.DayBytes, usage.DayLimit) || limitReached(usage.MonthBytes, usage.MonthLimit) {
		return false, nil
	}
	for _, candidate := range usage.Repositories {
		if candidate.Name != repository {
			continue
		}
		if limitReached(candidate.DayBytes, candidate.DayLimit) ||
			limitReached(candidate.MonthBytes, candidate.MonthLimit) {
			return false, nil
		}
		return taskCapacityAvailable(candidate.Tasks, taskID, taskDailyLimit), nil
	}
	return true, nil
}

func limitReached(used, limit int64) bool {
	return limit > 0 && used >= limit
}

func taskCapacityAvailable(tasks []taskUsage, taskID string, taskDailyLimit int64) bool {
	if taskID == "" || taskDailyLimit <= 0 {
		return true
	}
	current := taskUsage{ID: taskID, DayLimit: taskDailyLimit}
	found := false
	for _, task := range tasks {
		if task.ID == taskID {
			current = task
			current.DayLimit = taskDailyLimit
			found = true
			break
		}
	}
	if !found || (!current.Released && current.DayBytes < current.DayLimit) {
		return true
	}

	var released, borrowed int64
	for _, task := range tasks {
		limit := task.DayLimit
		if task.ID == taskID {
			limit = taskDailyLimit
		}
		entitlement := limit
		if task.Released {
			entitlement = task.ReleasedAtBytes
			released += max(0, limit-entitlement)
		}
		borrowed += max(0, task.DayBytes-entitlement)
	}
	return released > borrowed
}

func ReleaseAllocation(ctx context.Context, request ReleaseRequest) error {
	baseURL := strings.TrimRight(env.OpenListURL(), "/")
	if baseURL == "" || request.Repository == "" || request.TaskID == "" || request.DailyLimitBytes <= 0 {
		return nil
	}
	body, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("encode OpenList task release: %w", err)
	}
	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+releaseTaskPath, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create OpenList task release: %w", err)
	}
	httpRequest.Header.Set("Content-Type", "application/json")
	httpRequest.SetBasicAuth(env.OpenListUsername(), env.OpenListPassword())
	response, err := httpClient.Do(httpRequest)
	if err != nil {
		return fmt.Errorf("release OpenList task allocation: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("release OpenList task allocation: status %s", response.Status)
	}
	return nil
}

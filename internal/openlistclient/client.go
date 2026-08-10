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

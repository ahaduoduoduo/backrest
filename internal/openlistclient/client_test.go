package openlistclient

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/garethgeorge/backrest/internal/env"
)

func TestEncodeTaskUsername(t *testing.T) {
	got := EncodeTaskUsername("backrest", "nas-config", 5, 2)
	want := "backrest~bmFzLWNvbmZpZw~5368709120~2"
	if got != want {
		t.Fatalf("EncodeTaskUsername() = %q, want %q", got, want)
	}
}

func TestRepositoryName(t *testing.T) {
	for uri, want := range map[string]string{
		"rest:http://openlist:5244/restic/115-offsite/":     "115-offsite",
		"rest:https://example.test/api/restic/NAS%20Backup": "NAS Backup",
		"s3:https://example.test/bucket":                    "",
	} {
		if got := RepositoryName(uri); got != want {
			t.Fatalf("RepositoryName(%q) = %q, want %q", uri, got, want)
		}
	}
}

func TestUploadCapacityAvailable(t *testing.T) {
	tests := []struct {
		name      string
		usage     string
		repo      string
		task      string
		taskLimit int64
		available bool
	}{
		{
			name:      "available",
			usage:     `{"day_bytes":10,"day_limit":100,"repositories":[{"name":"synology","day_bytes":10,"day_limit":80,"tasks":[{"id":"time-machine","day_bytes":4,"day_limit":45}]}]}`,
			repo:      "synology",
			task:      "time-machine",
			taskLimit: 45,
			available: true,
		},
		{
			name:      "global daily quota exhausted",
			usage:     `{"day_bytes":100,"day_limit":100,"repositories":[{"name":"synology","day_bytes":80,"day_limit":80}]}`,
			repo:      "synology",
			task:      "time-machine",
			taskLimit: 45,
			available: false,
		},
		{
			name:      "repository monthly quota exhausted",
			usage:     `{"month_bytes":10,"month_limit":100,"repositories":[{"name":"synology","month_bytes":80,"month_limit":80}]}`,
			repo:      "synology",
			task:      "time-machine",
			taskLimit: 45,
			available: false,
		},
		{
			name:      "task daily quota exhausted",
			usage:     `{"day_bytes":45,"day_limit":50,"repositories":[{"name":"synology","day_bytes":45,"day_limit":50,"tasks":[{"id":"time-machine","day_bytes":45,"day_limit":45}]}]}`,
			repo:      "synology",
			task:      "time-machine",
			taskLimit: 45,
			available: false,
		},
		{
			name:      "task can borrow released capacity",
			usage:     `{"day_bytes":47,"day_limit":50,"repositories":[{"name":"synology","day_bytes":47,"day_limit":50,"tasks":[{"id":"nas-config","day_bytes":2,"day_limit":5,"released":true,"released_at_bytes":2},{"id":"time-machine","day_bytes":45,"day_limit":45}]}]}`,
			repo:      "synology",
			task:      "time-machine",
			taskLimit: 45,
			available: true,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				username, password, ok := r.BasicAuth()
				if r.URL.Path != usagePath || !ok || username != "backrest" || password != "secret" {
					t.Fatalf("unexpected OpenList request: %s %s", r.Method, r.URL.Path)
				}
				_, _ = fmt.Fprint(w, test.usage)
			}))
			defer server.Close()
			t.Setenv(env.EnvVarOpenListURL, server.URL)
			t.Setenv(env.EnvVarOpenListUsername, "backrest")
			t.Setenv(env.EnvVarOpenListPassword, "secret")

			available, err := UploadCapacityAvailable(context.Background(), test.repo, test.task, test.taskLimit)
			if err != nil {
				t.Fatalf("UploadCapacityAvailable() error = %v", err)
			}
			if available != test.available {
				t.Fatalf("UploadCapacityAvailable() = %v, want %v", available, test.available)
			}
		})
	}
}

package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/garethgeorge/backrest/internal/env"
)

func TestOpenListUsageHandlerUnconfigured(t *testing.T) {
	t.Setenv(env.EnvVarOpenListURL, "")
	request := httptest.NewRequest(http.MethodGet, "/api/openlist/restic/usage", nil)
	response := httptest.NewRecorder()
	NewOpenListUsageHandler().ServeHTTP(response, request)
	if response.Code != http.StatusOK || response.Body.String() != "{\"configured\":false}\n" {
		t.Fatalf("unexpected response: %d %s", response.Code, response.Body.String())
	}
}

func TestOpenListUsageHandler(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		username, password, ok := r.BasicAuth()
		if r.URL.Path != openListUsagePath || !ok || username != "backrest" || password != "secret" {
			t.Errorf("unexpected upstream request: %s %v %q", r.URL.Path, ok, username)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"day":"2026-08-06","day_bytes":42}`))
	}))
	defer upstream.Close()
	t.Setenv(env.EnvVarOpenListURL, upstream.URL)
	t.Setenv(env.EnvVarOpenListUsername, "backrest")
	t.Setenv(env.EnvVarOpenListPassword, "secret")

	request := httptest.NewRequest(http.MethodGet, "/api/openlist/restic/usage", nil)
	response := httptest.NewRecorder()
	NewOpenListUsageHandler().ServeHTTP(response, request)
	if response.Code != http.StatusOK || response.Body.String() != "{\"configured\":true,\"usage\":{\"day\":\"2026-08-06\",\"day_bytes\":42}}\n" {
		t.Fatalf("unexpected response: %d %s", response.Code, response.Body.String())
	}
}

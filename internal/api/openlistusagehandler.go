package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/garethgeorge/backrest/internal/env"
	"github.com/garethgeorge/backrest/internal/openlistclient"
)

type openListUsageHandler struct {
	client *http.Client
}

type openListUsageResponse struct {
	Configured bool            `json:"configured"`
	Usage      json.RawMessage `json:"usage,omitempty"`
}

func NewOpenListUsageHandler() http.Handler {
	return &openListUsageHandler{
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (h *openListUsageHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	baseURL := env.OpenListURL()
	if baseURL == "" {
		writeOpenListUsageJSON(w, http.StatusOK, openListUsageResponse{Configured: false})
		return
	}
	parsed, err := url.Parse(baseURL)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		http.Error(w, "invalid OpenList URL", http.StatusInternalServerError)
		return
	}
	request, err := http.NewRequestWithContext(r.Context(), http.MethodGet, openlistclient.UsageURL(), nil)
	if err != nil {
		http.Error(w, "OpenList request failed", http.StatusBadGateway)
		return
	}
	request.SetBasicAuth(env.OpenListUsername(), env.OpenListPassword())
	response, err := h.client.Do(request)
	if err != nil {
		http.Error(w, "OpenList unavailable", http.StatusBadGateway)
		return
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		http.Error(w, "OpenList status unavailable", http.StatusBadGateway)
		return
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil || !json.Valid(body) {
		http.Error(w, "invalid OpenList response", http.StatusBadGateway)
		return
	}
	writeOpenListUsageJSON(w, http.StatusOK, openListUsageResponse{
		Configured: true,
		Usage:      body,
	})
}

func writeOpenListUsageJSON(w http.ResponseWriter, status int, value openListUsageResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

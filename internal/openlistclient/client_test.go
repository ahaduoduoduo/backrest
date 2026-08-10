package openlistclient

import "testing"

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

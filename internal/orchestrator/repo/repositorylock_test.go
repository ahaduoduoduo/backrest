package repo

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestRepositoryLockAllowsConcurrentSharedAccess(t *testing.T) {
	lock := newRepositoryLock()
	releaseFirst, err := lock.acquireShared(context.Background())
	if err != nil {
		t.Fatalf("acquire first shared lock: %v", err)
	}
	defer releaseFirst()

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	releaseSecond, err := lock.acquireShared(ctx)
	if err != nil {
		t.Fatalf("acquire second shared lock: %v", err)
	}
	releaseSecond()
}

func TestRepositoryLockExclusiveWaitCanBeCancelled(t *testing.T) {
	lock := newRepositoryLock()
	releaseShared, err := lock.acquireShared(context.Background())
	if err != nil {
		t.Fatalf("acquire shared lock: %v", err)
	}
	defer releaseShared()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := lock.acquireExclusive(ctx); !errors.Is(err, context.Canceled) {
		t.Fatalf("acquire exclusive lock error = %v, want context.Canceled", err)
	}
}

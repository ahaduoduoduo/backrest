package repo

import (
	"context"

	"golang.org/x/sync/semaphore"
)

// repositoryLock is a context-aware reader/writer lock. Backups acquire one
// shared slot, while maintenance acquires every slot. Unlike sync.RWMutex,
// waiting for either mode can be interrupted when an operation is cancelled.
type repositoryLock struct {
	sem *semaphore.Weighted
}

const repositoryLockCapacity int64 = 1 << 20

func newRepositoryLock() *repositoryLock {
	return &repositoryLock{sem: semaphore.NewWeighted(repositoryLockCapacity)}
}

func (l *repositoryLock) acquireShared(ctx context.Context) (func(), error) {
	if err := l.sem.Acquire(ctx, 1); err != nil {
		return nil, err
	}
	return func() { l.sem.Release(1) }, nil
}

func (l *repositoryLock) acquireExclusive(ctx context.Context) (func(), error) {
	if err := l.sem.Acquire(ctx, repositoryLockCapacity); err != nil {
		return nil, err
	}
	return func() { l.sem.Release(repositoryLockCapacity) }, nil
}

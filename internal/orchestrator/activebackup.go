package orchestrator

import "github.com/garethgeorge/backrest/internal/orchestrator/tasks"

func taskBackupKey(task tasks.Task) string {
	if task == nil || task.Type() != "backup" {
		return ""
	}
	return task.RepoID() + "\x00" + task.PlanID()
}

func (o *Orchestrator) beginBackup(key string, operationID int64) bool {
	o.activeBackupMu.Lock()
	defer o.activeBackupMu.Unlock()
	if _, exists := o.activeBackups[key]; exists {
		return false
	}
	o.activeBackups[key] = operationID
	return true
}

func (o *Orchestrator) endBackup(key string, operationID int64) {
	o.activeBackupMu.Lock()
	defer o.activeBackupMu.Unlock()
	if current, exists := o.activeBackups[key]; exists && current == operationID {
		delete(o.activeBackups, key)
	}
}

package tasks

import "testing"

func TestPlanTaskPriorityOrdersSignedWeights(t *testing.T) {
	if PlanTaskPriority(2) <= PlanTaskPriority(1) {
		t.Fatal("priority 2 must run before priority 1")
	}
	if PlanTaskPriority(0) <= PlanTaskPriority(-1) {
		t.Fatal("priority 0 must run before priority -1")
	}
}

func TestPlanTaskPriorityStaysInsideBackupClass(t *testing.T) {
	for _, weight := range []int32{-1 << 31, -1, 0, 1, 1<<31 - 1} {
		priority := PlanTaskPriority(weight)
		if !IsPlanTaskPriority(priority) {
			t.Fatalf("weight %d escaped scheduled-backup priority class", weight)
		}
		if priority <= TaskPriorityStats || priority >= TaskPriorityForget {
			t.Fatalf("weight %d crossed a neighboring task class", weight)
		}
	}
}

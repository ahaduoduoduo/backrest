//go:build windows
// +build windows

package platformutil

import (
	"os/exec"
	"syscall"
)

func SetPlatformOptions(cmd *exec.Cmd) {
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.HideWindow = true
}

// SetProcessGroupCancellation uses exec.CommandContext's default process
// cancellation on Windows. Unix command hooks additionally need process-group
// termination because they normally run through a shell.
func SetProcessGroupCancellation(cmd *exec.Cmd) {}

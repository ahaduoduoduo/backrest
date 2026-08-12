//go:build !windows
// +build !windows

package platformutil

import (
	"errors"
	"os"
	"os/exec"
	"syscall"
)

func SetPlatformOptions(cmd *exec.Cmd) {
	// No special options needed for non-Windows platforms
}

// SetProcessGroupCancellation makes context cancellation stop the shell and
// every child process started by it. Command hooks commonly invoke scripts
// that wait or spawn helpers, so killing only the shell leaves the hook alive.
func SetProcessGroupCancellation(cmd *exec.Cmd) {
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.Setpgid = true
	cmd.Cancel = func() error {
		if cmd.Process == nil {
			return os.ErrProcessDone
		}
		if err := syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL); err != nil {
			if errors.Is(err, syscall.ESRCH) {
				return os.ErrProcessDone
			}
			return err
		}
		return nil
	}
}

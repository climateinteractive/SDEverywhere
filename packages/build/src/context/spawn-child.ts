// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { ChildProcess } from 'child_process'

import { spawn } from 'cross-spawn'

import { log } from '../_shared/log'

/**
 * @hidden This isn't ready to be included in the public API just yet.
 */
export interface ProcessOptions {
  logOutput?: boolean
  ignoredMessageFilter?: string
  captureOutput?: boolean
  ignoreError?: boolean
}

/**
 * @hidden This isn't ready to be included in the public API just yet.
 */
export interface ProcessOutput {
  exitCode: number
  stdoutMessages: string[]
  stderrMessages: string[]
}

/**
 * Spawn a child process that runs the given command.
 *
 * @param cwd The directory in which the command will be executed.
 * @param command The command to execute.
 * @param args The arguments to pass to the command.
 * @param abortSignal The signal used to abort the process.
 * @param opts Additional options to configure the process.
 * @returns The output of the process.
 */
export function spawnChild(
  cwd: string,
  command: string,
  args: string[],
  abortSignal?: AbortSignal,
  opts?: ProcessOptions
): Promise<ProcessOutput> {
  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new Error('ABORT'))
      return
    }

    let childProc: ChildProcess

    const localLog = (s: string, err = false) => {
      // Don't log anything after the process has been killed
      if (childProc === undefined) {
        return
      }
      log(err ? 'error' : 'info', s)
    }

    const abortHandler = () => {
      if (childProc) {
        log('info', 'Killing existing build process...')
        childProc.kill('SIGKILL')
        childProc = undefined
      }
      reject(new Error('ABORT'))
    }

    // Kill the process if abort is requested
    abortSignal?.addEventListener('abort', abortHandler, { once: true })

    // Prepare for capturing output, if requested
    const stdoutMessages: string[] = []
    const stderrMessages: string[] = []
    const logMessage = (msg: string, err: boolean) => {
      let includeMessage = true
      if (opts?.ignoredMessageFilter && msg.trim().startsWith(opts.ignoredMessageFilter)) {
        includeMessage = false
      }
      if (includeMessage) {
        const lines = msg.trim().split('\n')
        for (const line of lines) {
          localLog(`  ${line}`, err)
        }
      }
    }

    // Spawn the (asynchronous) child process.  Note that we are using `spawn`
    // from the `cross-spawn` package as an alternative to the built-in
    // `child_process` module, which doesn't handle spaces in command path
    // on Windows.
    childProc = spawn(command, args, {
      cwd
    })

    childProc.stdout.on('data', (data: Buffer) => {
      const msg = data.toString()
      if (opts?.captureOutput === true) {
        stdoutMessages.push(msg)
      }
      if (opts?.logOutput !== false) {
        logMessage(msg, false)
      }
    })
    childProc.stderr.on('data', (data: Buffer) => {
      const msg = data.toString()
      if (opts?.captureOutput === true) {
        stderrMessages.push(msg)
      }
      if (opts?.logOutput !== false) {
        logMessage(msg, true)
      }
    })
    childProc.on('error', err => {
      localLog(`Process error: ${err}`, true)
    })
    childProc.on('close', (code, signal) => {
      // Stop listening for abort events
      abortSignal?.removeEventListener('abort', abortHandler)
      childProc = undefined

      if (signal) {
        // The process was killed by a signal, so we don't need to print anything
        return
      }

      const processOutput: ProcessOutput = {
        exitCode: code,
        stdoutMessages,
        stderrMessages
      }

      if (code === 0) {
        // The process exited cleanly; resolve the promise
        resolve(processOutput)
      } else if (!signal) {
        // The process failed
        if (opts?.ignoreError === true) {
          // Resolve the promise (but with a non-zero exit code)
          resolve(processOutput)
        } else {
          // Reject the promise
          reject(new Error(`Child process failed (code=${code})`))
        }
      }
    })
  })
}

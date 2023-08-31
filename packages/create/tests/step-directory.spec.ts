// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import { dirname, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'

import { execa } from 'execa'
import { describe, it } from 'vitest'

const testsDir = dirname(fileURLToPath(import.meta.url))
const dirs = {
  nonExistent: './fixtures/non-existent-dir',
  nonEmpty: './fixtures/non-empty-dir',
  empty: './fixtures/empty-dir'
}

const promptMessages = {
  directory: 'Where would you like to create your new project?',
  template: 'Which template would you like to use?'
}

function runCreate(args: string[] = []) {
  const { stdout, stdin } = execa('../bin/create-sde.js', [...args, '--dry-run'], { cwd: testsDir })
  return {
    stdin,
    stdout
  }
}

describe('step - create project directory', () => {
  // it('should stop if directory provided on command line contains important files', () => {
  //   // TODO
  // })

  it('should proceed if directory provided on command line is empty', async () => {
    const emptyDir = resolvePath(testsDir, dirs.empty)
    if (!existsSync(emptyDir)) {
      await mkdir(emptyDir)
    }
    return new Promise(resolve => {
      const { stdout } = runCreate([dirs.empty])
      stdout?.on('data', chunk => {
        if (chunk.includes(promptMessages.template)) {
          resolve(undefined)
        }
      })
    })
  })

  // TODO: This test is temporarily disabled because it creates an untracked
  // directory which causes the build to fail at the end (where it checks for
  // untracked files); need to fix this to remove the directory after the test
  // it('should proceed if directory provided on command line does not exist', () => {
  //   return new Promise(resolve => {
  //     const { stdout } = runCreate([dirs.nonExistent])
  //     stdout?.on('data', chunk => {
  //       if (chunk.includes(promptMessages.template)) {
  //         resolve(undefined)
  //       }
  //     })
  //   })
  // })

  it('should prompt for directory when none is provided on command line', () => {
    return new Promise(resolve => {
      const { stdout } = runCreate()
      stdout?.on('data', chunk => {
        if (chunk.includes(promptMessages.directory)) {
          resolve(undefined)
        }
      })
    })
  })

  // TODO: The child process should exit in this case; need to check exit code
  // it('should stop if directory provided at prompt contains important files', () => {
  //   return new Promise(resolve => {
  //     const { stdout, stdin } = runCreate()
  //     stdout?.on('data', chunk => {
  //       console.log(chunk.toString())
  //       if (chunk.includes('contains existing')) {
  //         resolve(undefined)
  //       }
  //       if (chunk.includes(promptMessages.directory)) {
  //         stdin?.write(`${dirs.nonEmpty}\x0D`)
  //       }
  //     })
  //   })
  // })

  it('should proceed if directory provided at prompt is empty', async () => {
    return new Promise(resolve => {
      const { stdout, stdin } = runCreate()
      stdout?.on('data', chunk => {
        if (chunk.includes(promptMessages.template)) {
          resolve(undefined)
        }
        if (chunk.includes(promptMessages.directory)) {
          stdin?.write(`${dirs.empty}\x0D`)
        }
      })
    })
  })

  // TODO: This test is temporarily disabled because it creates an untracked
  // directory which causes the build to fail at the end (where it checks for
  // untracked files); need to fix this to remove the directory after the test
  // it('should proceed if directory provided at prompt does not exist', () => {
  //   return new Promise(resolve => {
  //     const { stdout, stdin } = runCreate()
  //     stdout?.on('data', chunk => {
  //       if (chunk.includes(promptMessages.template)) {
  //         resolve(undefined)
  //       }
  //       if (chunk.includes(promptMessages.directory)) {
  //         stdin?.write(`${dirs.nonExistent}\x0D`)
  //       }
  //     })
  //   })
  // })
})

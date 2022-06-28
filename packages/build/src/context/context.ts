// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { LogLevel } from '../_shared/log'
import { log } from '../_shared/log'

import type { ResolvedConfig } from '../_shared/resolved-config'

import type { ProcessOptions, ProcessOutput } from './spawn-child'
import { spawnChild } from './spawn-child'
import type { StagedFiles } from './staged-files'

/**
 * Provides access to common functionality that is needed during the build process.
 * This is passed to most plugin functions.
 */
export class BuildContext {
  /**
   * @param config The resolved configuration.
   * @hidden
   */
  constructor(
    public readonly config: ResolvedConfig,
    private readonly stagedFiles: StagedFiles,
    private readonly abortSignal: AbortSignal | undefined
  ) {}

  /**
   * Log a message to the console and/or the in-browser overlay panel.
   *
   * @param level The log level (verbose, info, error).
   * @param msg The message.
   */
  log(level: LogLevel, msg: string): void {
    log(level, msg)
  }

  /**
   * Prepare for writing a file to the staged directory.
   *
   * This will add the path to the array of tracked files and will create the
   * staged directory if needed.
   *
   * @param srcDir The directory underneath the configured `staged` directory where
   * the file will be written (this must be a relative path).
   * @param srcFile The name of the file as written to the `staged` directory.
   * @param dstDir The absolute path to the destination directory where the staged
   * file will be copied when the build has completed.
   * @param dstFile The name of the file as written to the destination directory.
   * @return The absolute path to the staged file.
   */
  prepareStagedFile(srcDir: string, srcFile: string, dstDir: string, dstFile: string): string {
    return this.stagedFiles.prepareStagedFile(srcDir, srcFile, dstDir, dstFile)
  }

  /**
   * Write a file to the staged directory.
   *
   * This file will be copied (along with other staged files) into the destination
   * directory only after the build process has completed.  Copying all staged files
   * at once helps improve the local development experience by making it so that
   * live reloading tools only need to refresh once instead of every time a build
   * file is written.
   *
   * @param srcDir The directory underneath the configured `staged` directory where
   * the file will be written (this must be a relative path).
   * @param dstDir The absolute path to the destination directory where the staged
   * file will be copied when the build has completed.
   * @param filename The name of the file.
   * @param content The file content.
   */
  writeStagedFile(srcDir: string, dstDir: string, filename: string, content: string): void {
    this.stagedFiles.writeStagedFile(srcDir, dstDir, filename, content)
  }

  /**
   * Spawn a child process that runs the given command.
   *
   * @param cwd The directory in which the command will be executed.
   * @param command The command to execute.
   * @param args The arguments to pass to the command.
   * @param opts Additional options to configure the process.
   * @returns The output of the process.
   */
  spawnChild(cwd: string, command: string, args: string[], opts?: ProcessOptions): Promise<ProcessOutput> {
    return spawnChild(cwd, command, args, this.abortSignal, opts)
  }
}

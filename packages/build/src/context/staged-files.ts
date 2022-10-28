// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { join as joinPath } from 'path'

import { log } from '../_shared/log'

interface StagedFile {
  srcDir: string
  srcFile: string
  dstDir: string
  dstFile: string
}

export class StagedFiles {
  private readonly baseStagedDir: string
  private readonly stagedFiles: StagedFile[] = []

  constructor(prepDir: string) {
    this.baseStagedDir = joinPath(prepDir, 'staged')
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
    // Add an entry to the array of staged files (only if an entry does not already
    // exist) so that we can copy the file to the destination directory when the build
    // process has completed
    const stagedFile = {
      srcDir,
      srcFile,
      dstDir,
      dstFile
    }
    // TODO: We allow there to be more than one entry for each source path to
    // support the case where a single source file gets copied to multiple
    // destination paths.  But we should throw an error if the same destination
    // path is configured for different source paths.
    if (this.stagedFiles.indexOf(stagedFile) < 0) {
      this.stagedFiles.push(stagedFile)
    }

    // Create the directory underneath the staged directory if needed
    const stagedDir = joinPath(this.baseStagedDir, srcDir)
    if (!existsSync(stagedDir)) {
      mkdirSync(stagedDir, { recursive: true })
    }

    return joinPath(stagedDir, srcFile)
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
    // Add an entry to track the file and create the staged directory if needed
    const stagedFilePath = this.prepareStagedFile(srcDir, filename, dstDir, filename)

    // Write the file to the staged directory
    writeFileSync(stagedFilePath, content)
  }

  /**
   * Return the absolute path to the staged file for the given source directory and file name.
   *
   * @param srcDir The directory underneath the configured `staged` directory where
   * the file would be written initially (this must be a relative path).
   * @param srcFile The name of the file.
   */
  getStagedFilePath(srcDir: string, srcFile: string): string {
    return joinPath(this.baseStagedDir, srcDir, srcFile)
  }

  /**
   * Return true if the staged file exists for the given source directory and file name.
   *
   * @param srcDir The directory underneath the configured `staged` directory where
   * the file would be written initially (this must be a relative path).
   * @param srcFile The name of the file.
   */
  stagedFileExists(srcDir: string, srcFile: string): boolean {
    const fullSrcPath = this.getStagedFilePath(srcDir, srcFile)
    return existsSync(fullSrcPath)
  }

  /**
   * Return true if the destination file exists for the given source directory and file name.
   *
   * @param srcDir The directory underneath the configured `staged` directory where
   * the file would be written initially (this must be a relative path).
   * @param srcFile The name of the file.
   */
  destinationFileExists(srcDir: string, srcFile: string): boolean {
    const f = this.stagedFiles.find(f => f.srcDir === srcDir && f.srcFile === srcFile)
    if (f === undefined) {
      return false
    }
    const fullDstPath = joinPath(f.dstDir, f.dstFile)
    return existsSync(fullDstPath)
  }

  /**
   * Copy staged files to their destination; this will only copy the staged
   * files if they are different than the existing destination files.  We
   * copy the files in a batch like this so that hot module reload is only
   * triggered once at the end of the whole build process.
   */
  copyChangedFiles(): void {
    log('info', 'Copying changed files into place...')

    for (const f of this.stagedFiles) {
      this.copyStagedFile(f)
    }

    log('info', 'Done copying files')
  }

  /**
   * Copy a file from the `staged` directory to its destination.  If the file already
   * exists in the destination directory and has the same contents as the source file,
   * the file will not be copied and this function will return false.
   *
   * @param f The staged file entry.
   */
  private copyStagedFile(f: StagedFile): boolean {
    // Create the destination directory, if needed
    if (!existsSync(f.dstDir)) {
      mkdirSync(f.dstDir, { recursive: true })
    }

    // If the destination file already exists and has the same contents as the source
    // file, we can skip copying it
    const fullSrcPath = this.getStagedFilePath(f.srcDir, f.srcFile)
    const fullDstPath = joinPath(f.dstDir, f.dstFile)
    const needsCopy = filesDiffer(fullSrcPath, fullDstPath)
    if (needsCopy) {
      log('verbose', `  Copying ${f.srcFile} to ${fullDstPath}`)
      copyFileSync(fullSrcPath, fullDstPath)
    }
    return needsCopy
  }
}

/**
 * Return true if both files exist at the given paths and have the same contents, false otherwise.
 */
function filesDiffer(aPath: string, bPath: string): boolean {
  if (existsSync(aPath) && existsSync(bPath)) {
    // The files exist; see if they are different
    const aSize = statSync(aPath).size
    const bSize = statSync(bPath).size
    if (aSize !== bSize) {
      // The sizes are different, so the contents must be different
      return true
    } else {
      // The sizes are the same, so check the contents
      const aBuf = readFileSync(aPath)
      const bBuf = readFileSync(bPath)
      return !aBuf.equals(bBuf)
    }
  } else {
    // One or both files do not exist
    return true
  }
}

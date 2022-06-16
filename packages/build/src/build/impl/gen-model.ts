// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { ChildProcess } from 'child_process'
import { copyFile, readdir, readFile, writeFile } from 'fs/promises'
import { join as joinPath } from 'path'

import { spawn } from 'cross-spawn'

import { log } from '../../_shared/log'

import type { BuildContext } from '../../context/context'
// import type { StagedFiles } from '../../context/staged-files'

import type { Plugin } from '../../plugin/plugin'

interface ProcessOptions {
  logOutput?: boolean
  ignoredMessageFilter?: string
  captureOutput?: boolean
  ignoreError?: boolean
}

interface ProcessOutput {
  exitCode: number
  stdoutMessages: string[]
  stderrMessages: string[]
}

/**
 * Generate the model.  This will run the core SDEverywhere code generation steps
 * and will also invoke the following plugin functions:
 *   - `preProcessMdl`
 *   - `postProcessMdl`
 *   - `preGenerateC`
 *   - `postGenerateC`
 */
export async function generateModel(
  context: BuildContext,
  // stagedFiles: StagedFiles,
  plugins: Plugin[],
  signal?: AbortSignal
): Promise<void> {
  log('info', 'Generating model...')

  const t0 = performance.now()

  // Use the defined prep directory
  const config = context.config
  const prepDir = config.prepDir

  // XXX: On Windows, we need to use Windows-specific commands; need to revisit
  const isWin = process.platform === 'win32'
  const sdeCmdPath = isWin ? `${config.sdeCmdPath}.cmd` : config.sdeCmdPath
  // const emccCmd = isWin ? 'emcc.bat' : 'emcc'
  // const emccCmdPath = joinPath(config.emsdkDir, 'upstream', 'emscripten', emccCmd)

  // Process the mdl file(s)
  for (const plugin of plugins) {
    if (plugin.preProcessMdl) {
      await plugin.preProcessMdl(context)
    }
  }
  if (config.modelFiles.length === 0) {
    // Require at least one input file
    throw new Error('No model input files specified')
  } else if (config.modelFiles.length === 1) {
    // Preprocess the single mdl file
    await preprocessMdl(sdeCmdPath, prepDir, config.modelFiles[0], signal)
  } else {
    // Flatten and preprocess the multiple mdl files into a single mdl file
    await flattenMdls(sdeCmdPath, prepDir, config.modelFiles, signal)
  }
  for (const plugin of plugins) {
    if (plugin.postProcessMdl) {
      const mdlPath = joinPath(prepDir, 'processed.mdl')
      let mdlContent = await readFile(mdlPath, 'utf8')
      mdlContent = await plugin.postProcessMdl(context, mdlContent)
      await writeFile(mdlPath, mdlContent)
    }
  }

  // Generate the C file
  for (const plugin of plugins) {
    if (plugin.preGenerateC) {
      await plugin.preGenerateC(context)
    }
  }
  await generateC(config.sdeDir, sdeCmdPath, prepDir, signal)
  for (const plugin of plugins) {
    if (plugin.postGenerateC) {
      const cPath = joinPath(prepDir, 'build', 'processed.c')
      let cContent = await readFile(cPath, 'utf8')
      cContent = await plugin.postGenerateC(context, cContent)
      await writeFile(cPath, cContent)
    }
  }

  // // Generate the WASM binary (wrapped in a JS file)
  // if (callbacks.preBuildWasm) {
  //   await callbacks.preBuildWasm(context)
  // }
  // const outputJsPath = stagedFiles.getStagedFilePath('model', config.outputJsFile)
  // await buildWasm(emccCmdPath, prepDir, outputJsPath, signal)
  // if (callbacks.postBuildWasm) {
  //   await callbacks.postBuildWasm(context)
  // }

  const t1 = performance.now()
  const elapsed = ((t1 - t0) / 1000).toFixed(1)
  log('info', `Done generating model (${elapsed}s)`)
}

/**
 * Preprocess a single mdl file and copy the resulting `processed.mdl` to the prep directory.
 */
async function preprocessMdl(
  sdeCmdPath: string,
  prepDir: string,
  modelFile: string,
  signal?: AbortSignal
): Promise<void> {
  log('info', '  Preprocessing mdl file')

  // Copy the source file to the prep directory to make the next steps easier
  await copyFile(modelFile, joinPath(prepDir, 'processed.mdl'))

  // Use SDE to preprocess the model to strip anything that's not needed to build it
  const command = sdeCmdPath
  const args = ['generate', '--preprocess', 'processed.mdl']
  await spawnChild(prepDir, command, args, signal)

  // Copy the processed file back to the prep directory
  await copyFile(joinPath(prepDir, 'build', 'processed.mdl'), joinPath(prepDir, 'processed.mdl'))
}

/**
 * Flatten multiple mdl files and copy the resulting `processed.mdl` to the prep directory.
 */
async function flattenMdls(
  sdeCmdPath: string,
  prepDir: string,
  modelFiles: string[],
  signal?: AbortSignal
): Promise<void> {
  log('verbose', '  Flattening and preprocessing mdl files')

  // Use SDE to flatten the parent model and submodels into a single mdl file,
  // then preprocess to strip anything that's not needed to build the model
  const command = sdeCmdPath
  const args: string[] = []
  args.push('flatten')
  args.push('processed.mdl')
  args.push('--inputs')
  for (const path of modelFiles) {
    args.push(path)
  }

  // Disable logging by default; this will suppress flatten warnings, which are
  // sometimes unavoidable and not helpful
  const output = await spawnChild(prepDir, command, args, signal, {
    logOutput: false,
    captureOutput: true,
    ignoreError: true
  })

  // Check for flattening errors
  let flattenErrors = false
  for (const msg of output.stderrMessages) {
    if (msg.includes('ERROR')) {
      flattenErrors = true
      break
    }
  }
  if (flattenErrors) {
    log('error', 'There were errors reported when flattening the model:')
    for (const msg of output.stderrMessages) {
      const lines = msg.split('\n')
      for (const line of lines) {
        log('error', `  ${line}`)
      }
    }
    throw new Error(`Flatten command failed (code=${output.exitCode})`)
  } else if (output.exitCode !== 0) {
    throw new Error(`Flatten command failed (code=${output.exitCode})`)
  }

  // Copy the processed file back to the prep directory
  await copyFile(joinPath(prepDir, 'build', 'processed.mdl'), joinPath(prepDir, 'processed.mdl'))
}

/**
 * Generate a C file from the `processed.mdl` file.
 */
async function generateC(sdeDir: string, sdeCmdPath: string, prepDir: string, signal?: AbortSignal): Promise<void> {
  log('verbose', '  Generating C code')

  // Use SDE to generate a C version of the model
  const command = sdeCmdPath
  const args = ['generate', '--genc', '--spec', 'spec.json', 'processed']
  await spawnChild(prepDir, command, args, signal, {
    // By default, ignore lines that start with "WARNING: Data for" since these are often harmless
    // TODO: Don't filter by default, but make it configurable
    // ignoredMessageFilter: 'WARNING: Data for'
  })

  // Copy SDE's supporting C files into the build directory
  const buildDir = joinPath(prepDir, 'build')
  const sdeCDir = joinPath(sdeDir, 'src', 'c')
  const files = await readdir(sdeCDir)
  const copyOps = []
  for (const file of files) {
    if (file.endsWith('.c') || file.endsWith('.h')) {
      copyOps.push(copyFile(joinPath(sdeCDir, file), joinPath(buildDir, file)))
    }
  }
  await Promise.all(copyOps)
}

// /**
//  * Generate a JS file (containing an embedded WASM blob) from the C file.
//  */
// async function buildWasm(
//   emccCmdPath: string,
//   prepDir: string,
//   outputJsPath: string,
//   signal?: AbortSignal
// ): Promise<void> {
//   log('verbose', '  Generating WebAssembly module')

//   // Use Emscripten to compile the C model into a WASM blob packaged inside
//   // an ES6 module.  We use `SINGLE_FILE=1` to include the WASM directly
//   // inside the JS file as a base64-encoded string.  This increases the
//   // total file size by about 30%, but having it bundled makes building
//   // easier and improves startup time (we don't have make a separate fetch
//   // to load it over the network).
//   const command = emccCmdPath
//   const args: string[] = []
//   const addArg = (arg: string) => {
//     args.push(arg)
//   }
//   const addInput = (file: string) => {
//     addArg(`build/${file}`)
//   }
//   const addFlag = (flag: string) => {
//     addArg('-s')
//     addArg(flag)
//   }
//   addInput('processed.c')
//   addInput('macros.c')
//   addInput('model.c')
//   addInput('vensim.c')
//   addArg('-Ibuild')
//   addArg('-o')
//   addArg(outputJsPath)
//   addArg('-Wall')
//   addArg('-Os')
//   addFlag('STRICT=1')
//   addFlag('MALLOC=emmalloc')
//   addFlag('FILESYSTEM=0')
//   addFlag('MODULARIZE=1')
//   addFlag('SINGLE_FILE=1')
//   addFlag('EXPORT_ES6=1')
//   addFlag('USE_ES6_IMPORT_META=0')
//   addFlag(`EXPORTED_FUNCTIONS=['_malloc','_runModelWithBuffers']`)
//   addFlag(`EXPORTED_RUNTIME_METHODS=['cwrap']`)
//   await spawnChild(prepDir, command, args, signal, {
//     // Ignore unhelpful Emscripten SDK cache messages
//     ignoredMessageFilter: 'cache:INFO'
//   })
// }

function spawnChild(
  prepDir: string,
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
      cwd: prepDir
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

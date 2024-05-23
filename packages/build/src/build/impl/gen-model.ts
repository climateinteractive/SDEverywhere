// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { copyFile, readdir, readFile, writeFile } from 'fs/promises'
import { join as joinPath } from 'path'

import { log } from '../../_shared/log'

import type { BuildContext } from '../../context/context'

import type { Plugin } from '../../plugin/plugin'

/**
 * Generate the model.  This will run the core SDEverywhere code generation steps
 * and will also invoke the following plugin functions:
 *   - `preProcessMdl`
 *   - `postProcessMdl`
 *   - `preGenerateC`
 *   - `postGenerateC`
 */
export async function generateModel(context: BuildContext, plugins: Plugin[]): Promise<void> {
  const config = context.config
  if (config.modelFiles.length === 0) {
    log('info', 'No model input files specified, skipping model generation steps')
    return
  }

  log('info', 'Generating model...')

  const t0 = performance.now()

  // Use the defined prep directory
  const prepDir = config.prepDir

  // TODO: For now we assume the path is to the `main.js` file in the cli package;
  // this seems to work on both Unix and Windows, but we may need to revisit this
  // as part of removing the `sdeCmdPath` config hack
  const sdeCmdPath = config.sdeCmdPath

  // Process the mdl file(s)
  for (const plugin of plugins) {
    if (plugin.preProcessMdl) {
      await plugin.preProcessMdl(context)
    }
  }
  if (config.modelFiles.length === 1) {
    // Preprocess the single mdl file
    await preprocessMdl(context, sdeCmdPath, prepDir, config.modelFiles[0])
  } else {
    // Flatten and preprocess the multiple mdl files into a single mdl file
    await flattenMdls(context, sdeCmdPath, prepDir, config.modelFiles)
  }
  for (const plugin of plugins) {
    if (plugin.postProcessMdl) {
      const mdlPath = joinPath(prepDir, 'processed.mdl')
      let mdlContent = await readFile(mdlPath, 'utf8')
      mdlContent = await plugin.postProcessMdl(context, mdlContent)
      await writeFile(mdlPath, mdlContent)
    }
  }

  // Generate the JS or C file
  for (const plugin of plugins) {
    if (plugin.preGenerateCode) {
      await plugin.preGenerateCode(context, config.genFormat)
    }
  }
  await generateCode(context, config.sdeDir, sdeCmdPath, prepDir)
  for (const plugin of plugins) {
    if (plugin.postGenerateCode) {
      const generatedCodeFile = `processed.${config.genFormat}`
      const generatedCodePath = joinPath(prepDir, 'build', generatedCodeFile)
      let generatedCodeContent = await readFile(generatedCodePath, 'utf8')
      generatedCodeContent = await plugin.postGenerateC(context, generatedCodeContent)
      await writeFile(generatedCodePath, generatedCodeContent)
    }
  }

  const t1 = performance.now()
  const elapsed = ((t1 - t0) / 1000).toFixed(1)
  log('info', `Done generating model (${elapsed}s)`)
}

/**
 * Preprocess a single mdl file and copy the resulting `processed.mdl` to the prep directory.
 */
async function preprocessMdl(
  context: BuildContext,
  sdeCmdPath: string,
  prepDir: string,
  modelFile: string
): Promise<void> {
  log('verbose', '  Preprocessing mdl file')

  // Copy the source file to the prep directory to make the next steps easier
  await copyFile(modelFile, joinPath(prepDir, 'processed.mdl'))

  // Use SDE to preprocess the model to strip anything that's not needed to build it
  const command = sdeCmdPath
  const args = ['generate', '--preprocess', 'processed.mdl']
  const ppOutput = await context.spawnChild(prepDir, command, args, {
    // The default error message from `spawnChild` is not very informative, so the
    // following allows us to throw our own error
    ignoreError: true
  })
  if (ppOutput.exitCode !== 0) {
    throw new Error(`Failed to preprocess mdl file: 'sde generate' command failed (code=${ppOutput.exitCode})`)
  }

  // Copy the processed file back to the prep directory
  await copyFile(joinPath(prepDir, 'build', 'processed.mdl'), joinPath(prepDir, 'processed.mdl'))
}

/**
 * Flatten multiple mdl files and copy the resulting `processed.mdl` to the prep directory.
 */
async function flattenMdls(
  context: BuildContext,
  sdeCmdPath: string,
  prepDir: string,
  modelFiles: string[]
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
  const output = await context.spawnChild(prepDir, command, args, {
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
    throw new Error(`Failed to flatten mdl files: 'sde flatten' command failed (code=${output.exitCode})`)
  } else if (output.exitCode !== 0) {
    throw new Error(`Failed to flatten mdl files: 'sde flatten' command failed (code=${output.exitCode})`)
  }

  // Copy the processed file back to the prep directory
  await copyFile(joinPath(prepDir, 'build', 'processed.mdl'), joinPath(prepDir, 'processed.mdl'))
}

/**
 * Generate a JS or C file from the `processed.mdl` file.
 */
async function generateCode(context: BuildContext, sdeDir: string, sdeCmdPath: string, prepDir: string): Promise<void> {
  const genFormat = context.config.genFormat
  const genFormatName = genFormat.toUpperCase()
  log('verbose', `  Generating ${genFormatName} code`)

  // Use SDE to generate both a JS/C version of the model (`--outformat`) AND a JSON list of all model
  // dimensions and variables (`--list`)
  const command = sdeCmdPath
  const outFormat = `--outformat=${genFormat}`
  const genCmdArgs = ['generate', outFormat, '--list', '--spec', 'spec.json', 'processed']
  const genCmdOutput = await context.spawnChild(prepDir, command, genCmdArgs, {
    // By default, ignore lines that start with "WARNING: Data for" since these are often harmless
    // TODO: Don't filter by default, but make it configurable
    // ignoredMessageFilter: 'WARNING: Data for'
    // The default error message from `spawnChild` is not very informative, so the
    // following allows us to throw our own error
    ignoreError: true
  })
  if (genCmdOutput.exitCode !== 0) {
    throw new Error(
      `Failed to generate ${genFormatName} code: 'sde generate' command failed (code=${genCmdOutput.exitCode})`
    )
  }

  if (genFormat === 'c') {
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
}

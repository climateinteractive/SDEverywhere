// src/build/build.ts
import { join as joinPath6 } from "path";
import { err as err3, ok as ok3 } from "neverthrow";

// src/config/config-loader.ts
import { existsSync, lstatSync, mkdirSync } from "fs";
import { dirname, join as joinPath, relative, resolve as resolvePath } from "path";
import { fileURLToPath } from "url";
import { err, ok } from "neverthrow";
async function loadConfig(mode, config, sdeDir, sdeCmdPath) {
  let userConfig;
  if (typeof config === "object") {
    userConfig = config;
  } else {
    let configPath;
    if (typeof config === "string") {
      configPath = config;
    } else {
      configPath = joinPath(process.cwd(), "sde.config.js");
    }
    try {
      if (!existsSync(configPath)) {
        return err(new Error(`Cannot find config file '${configPath}'`));
      }
      const configRelPath = relativeToSourcePath(configPath);
      const configModule = await import(configRelPath);
      userConfig = await configModule.config();
    } catch (e) {
      return err(new Error(`Failed to load config file '${configPath}': ${e.message}`));
    }
  }
  try {
    const resolvedConfig = resolveUserConfig(userConfig, mode, sdeDir, sdeCmdPath);
    return ok({
      userConfig,
      resolvedConfig
    });
  } catch (e) {
    return err(e);
  }
}
function resolveUserConfig(userConfig, mode, sdeDir, sdeCmdPath) {
  function expectDirectory(propName, path) {
    if (!existsSync(path)) {
      throw new Error(`The configured ${propName} (${path}) does not exist`);
    } else if (!lstatSync(path).isDirectory()) {
      throw new Error(`The configured ${propName} (${path}) is not a directory`);
    }
  }
  let rootDir;
  if (userConfig.rootDir) {
    rootDir = resolvePath(userConfig.rootDir);
    expectDirectory("rootDir", rootDir);
  } else {
    rootDir = process.cwd();
  }
  let prepDir;
  if (userConfig.prepDir) {
    prepDir = resolvePath(userConfig.prepDir);
  } else {
    prepDir = resolvePath(rootDir, "sde-prep");
  }
  mkdirSync(prepDir, { recursive: true });
  const userModelFiles = userConfig.modelFiles;
  const modelFiles = [];
  for (const userModelFile of userModelFiles) {
    const modelFile = resolvePath(userModelFile);
    if (!existsSync(modelFile)) {
      throw new Error(`The configured model file (${modelFile}) does not exist`);
    }
    modelFiles.push(modelFile);
  }
  let modelInputPaths;
  if (userConfig.modelInputPaths && userConfig.modelInputPaths.length > 0) {
    modelInputPaths = userConfig.modelInputPaths;
  } else {
    modelInputPaths = modelFiles;
  }
  let watchPaths;
  if (userConfig.watchPaths && userConfig.watchPaths.length > 0) {
    watchPaths = userConfig.watchPaths;
  } else {
    watchPaths = modelFiles;
  }
  return {
    mode,
    rootDir,
    prepDir,
    modelFiles,
    modelInputPaths,
    watchPaths,
    sdeDir,
    sdeCmdPath
  };
}
function relativeToSourcePath(filePath) {
  const srcDir = dirname(fileURLToPath(import.meta.url));
  const relPath = relative(srcDir, filePath);
  return relPath.replaceAll("\\", "/");
}

// src/_shared/log.ts
import { writeFileSync } from "fs";
import pico from "picocolors";
var activeLevels = /* @__PURE__ */ new Set(["error", "info"]);
var overlayFile;
var overlayEnabled = false;
var overlayHtml = "";
function setActiveLevels(logLevels) {
  activeLevels.clear();
  for (const level of logLevels) {
    activeLevels.add(level);
  }
}
function setOverlayFile(file, enabled) {
  overlayFile = file;
  overlayEnabled = enabled;
  writeFileSync(overlayFile, "");
}
function log(level, msg) {
  if (activeLevels.has(level)) {
    if (level === "error") {
      console.error(pico.red(msg));
      logToOverlay(msg);
    } else {
      console.log(msg);
      logToOverlay(msg);
    }
  }
}
function logError(e) {
  const stack = e.stack || "";
  const stackLines = stack.split("\n").filter((s) => s.match(/^\s+at/));
  const trace = stackLines.slice(0, 3).join("\n");
  console.error(pico.red(`
ERROR: ${e.message}`));
  console.error(pico.dim(pico.red(`${trace}
`)));
  logToOverlay(`
ERROR: ${e.message}`, true);
  logToOverlay(`${trace}
`, true);
}
function writeOverlayFiles() {
  writeFileSync(overlayFile, overlayHtml);
}
function clearOverlay() {
  if (!overlayEnabled) {
    return;
  }
  overlayHtml = "";
  writeOverlayFiles();
}
var indent = "&nbsp;".repeat(4);
function logToOverlay(msg, error = false) {
  if (!overlayEnabled) {
    return;
  }
  if (error) {
    msg = `<span class="overlay-error">${msg}</span>`;
  }
  const msgHtml = msg.replace(/\n/g, "\n<br/>").replace(/\s{2}/g, indent);
  if (overlayHtml) {
    overlayHtml += `<br/>${msgHtml}`;
  } else {
    overlayHtml = `${msgHtml}`;
  }
  writeOverlayFiles();
}

// src/build/impl/build-once.ts
import { existsSync as existsSync3, readFileSync as readFileSync2, writeFileSync as writeFileSync3 } from "fs";
import { writeFile as writeFile2 } from "fs/promises";
import { join as joinPath5 } from "path";
import { err as err2, ok as ok2 } from "neverthrow";

// src/context/spawn-child.ts
import { spawn } from "cross-spawn";
function spawnChild(cwd, command, args, abortSignal, opts) {
  return new Promise((resolve, reject) => {
    if (abortSignal == null ? void 0 : abortSignal.aborted) {
      reject(new Error("ABORT"));
      return;
    }
    let childProc;
    const localLog = (s, err4 = false) => {
      if (childProc === void 0) {
        return;
      }
      log(err4 ? "error" : "info", s);
    };
    const abortHandler = () => {
      if (childProc) {
        log("info", "Killing existing build process...");
        childProc.kill("SIGKILL");
        childProc = void 0;
      }
      reject(new Error("ABORT"));
    };
    abortSignal == null ? void 0 : abortSignal.addEventListener("abort", abortHandler, { once: true });
    const stdoutMessages = [];
    const stderrMessages = [];
    const logMessage = (msg, err4) => {
      let includeMessage = true;
      if ((opts == null ? void 0 : opts.ignoredMessageFilter) && msg.trim().startsWith(opts.ignoredMessageFilter)) {
        includeMessage = false;
      }
      if (includeMessage) {
        const lines = msg.trim().split("\n");
        for (const line of lines) {
          localLog(`  ${line}`, err4);
        }
      }
    };
    childProc = spawn(command, args, {
      cwd
    });
    childProc.stdout.on("data", (data) => {
      const msg = data.toString();
      if ((opts == null ? void 0 : opts.captureOutput) === true) {
        stdoutMessages.push(msg);
      }
      if ((opts == null ? void 0 : opts.logOutput) !== false) {
        logMessage(msg, false);
      }
    });
    childProc.stderr.on("data", (data) => {
      const msg = data.toString();
      if ((opts == null ? void 0 : opts.captureOutput) === true) {
        stderrMessages.push(msg);
      }
      if ((opts == null ? void 0 : opts.logOutput) !== false) {
        logMessage(msg, true);
      }
    });
    childProc.on("error", (err4) => {
      localLog(`Process error: ${err4}`, true);
    });
    childProc.on("close", (code, signal) => {
      abortSignal == null ? void 0 : abortSignal.removeEventListener("abort", abortHandler);
      childProc = void 0;
      if (signal) {
        return;
      }
      const processOutput = {
        exitCode: code,
        stdoutMessages,
        stderrMessages
      };
      if (code === 0) {
        resolve(processOutput);
      } else if (!signal) {
        if ((opts == null ? void 0 : opts.ignoreError) === true) {
          resolve(processOutput);
        } else {
          reject(new Error(`Child process failed (code=${code})`));
        }
      }
    });
  });
}

// src/context/context.ts
var BuildContext = class {
  constructor(config, stagedFiles, abortSignal) {
    this.config = config;
    this.stagedFiles = stagedFiles;
    this.abortSignal = abortSignal;
  }
  log(level, msg) {
    log(level, msg);
  }
  prepareStagedFile(srcDir, srcFile, dstDir, dstFile) {
    return this.stagedFiles.prepareStagedFile(srcDir, srcFile, dstDir, dstFile);
  }
  writeStagedFile(srcDir, dstDir, filename, content) {
    this.stagedFiles.writeStagedFile(srcDir, dstDir, filename, content);
  }
  spawnChild(cwd, command, args, opts) {
    return spawnChild(cwd, command, args, this.abortSignal, opts);
  }
};

// src/context/staged-files.ts
import { copyFileSync, existsSync as existsSync2, mkdirSync as mkdirSync2, readFileSync, statSync, writeFileSync as writeFileSync2 } from "fs";
import { join as joinPath2 } from "path";
var StagedFiles = class {
  constructor(prepDir) {
    this.stagedFiles = [];
    this.baseStagedDir = joinPath2(prepDir, "staged");
  }
  prepareStagedFile(srcDir, srcFile, dstDir, dstFile) {
    const stagedFile = {
      srcDir,
      srcFile,
      dstDir,
      dstFile
    };
    if (this.stagedFiles.indexOf(stagedFile) < 0) {
      this.stagedFiles.push(stagedFile);
    }
    const stagedDir = joinPath2(this.baseStagedDir, srcDir);
    if (!existsSync2(stagedDir)) {
      mkdirSync2(stagedDir, { recursive: true });
    }
    return joinPath2(stagedDir, srcFile);
  }
  writeStagedFile(srcDir, dstDir, filename, content) {
    const stagedFilePath = this.prepareStagedFile(srcDir, filename, dstDir, filename);
    writeFileSync2(stagedFilePath, content);
  }
  getStagedFilePath(srcDir, srcFile) {
    return joinPath2(this.baseStagedDir, srcDir, srcFile);
  }
  stagedFileExists(srcDir, srcFile) {
    const fullSrcPath = this.getStagedFilePath(srcDir, srcFile);
    return existsSync2(fullSrcPath);
  }
  destinationFileExists(srcDir, srcFile) {
    const f = this.stagedFiles.find((f2) => f2.srcDir === srcDir && f2.srcFile === srcFile);
    if (f === void 0) {
      return false;
    }
    const fullDstPath = joinPath2(f.dstDir, f.dstFile);
    return existsSync2(fullDstPath);
  }
  copyChangedFiles() {
    log("info", "Copying changed files into place...");
    for (const f of this.stagedFiles) {
      this.copyStagedFile(f);
    }
    log("info", "Done copying files");
  }
  copyStagedFile(f) {
    if (!existsSync2(f.dstDir)) {
      mkdirSync2(f.dstDir, { recursive: true });
    }
    const fullSrcPath = this.getStagedFilePath(f.srcDir, f.srcFile);
    const fullDstPath = joinPath2(f.dstDir, f.dstFile);
    const needsCopy = filesDiffer(fullSrcPath, fullDstPath);
    if (needsCopy) {
      log("verbose", `  Copying ${f.srcFile} to ${fullDstPath}`);
      copyFileSync(fullSrcPath, fullDstPath);
    }
    return needsCopy;
  }
};
function filesDiffer(aPath, bPath) {
  if (existsSync2(aPath) && existsSync2(bPath)) {
    const aSize = statSync(aPath).size;
    const bSize = statSync(bPath).size;
    if (aSize !== bSize) {
      return true;
    } else {
      const aBuf = readFileSync(aPath);
      const bBuf = readFileSync(bPath);
      return !aBuf.equals(bBuf);
    }
  } else {
    return true;
  }
}

// src/build/impl/gen-model.ts
import { copyFile, readdir, readFile, writeFile } from "fs/promises";
import { join as joinPath3 } from "path";
async function generateModel(context, plugins) {
  const config = context.config;
  if (config.modelFiles.length === 0) {
    log("info", "No model input files specified, skipping model generation steps");
    return;
  }
  log("info", "Generating model...");
  const t0 = performance.now();
  const prepDir = config.prepDir;
  const sdeCmdPath = config.sdeCmdPath;
  for (const plugin of plugins) {
    if (plugin.preProcessMdl) {
      await plugin.preProcessMdl(context);
    }
  }
  if (config.modelFiles.length === 1) {
    await preprocessMdl(context, sdeCmdPath, prepDir, config.modelFiles[0]);
  } else {
    await flattenMdls(context, sdeCmdPath, prepDir, config.modelFiles);
  }
  for (const plugin of plugins) {
    if (plugin.postProcessMdl) {
      const mdlPath = joinPath3(prepDir, "processed.mdl");
      let mdlContent = await readFile(mdlPath, "utf8");
      mdlContent = await plugin.postProcessMdl(context, mdlContent);
      await writeFile(mdlPath, mdlContent);
    }
  }
  for (const plugin of plugins) {
    if (plugin.preGenerateC) {
      await plugin.preGenerateC(context);
    }
  }
  await generateC(context, config.sdeDir, sdeCmdPath, prepDir);
  for (const plugin of plugins) {
    if (plugin.postGenerateC) {
      const cPath = joinPath3(prepDir, "build", "processed.c");
      let cContent = await readFile(cPath, "utf8");
      cContent = await plugin.postGenerateC(context, cContent);
      await writeFile(cPath, cContent);
    }
  }
  const t1 = performance.now();
  const elapsed = ((t1 - t0) / 1e3).toFixed(1);
  log("info", `Done generating model (${elapsed}s)`);
}
async function preprocessMdl(context, sdeCmdPath, prepDir, modelFile) {
  log("verbose", "  Preprocessing mdl file");
  await copyFile(modelFile, joinPath3(prepDir, "processed.mdl"));
  const command = sdeCmdPath;
  const args = ["generate", "--preprocess", "processed.mdl"];
  await context.spawnChild(prepDir, command, args);
  await copyFile(joinPath3(prepDir, "build", "processed.mdl"), joinPath3(prepDir, "processed.mdl"));
}
async function flattenMdls(context, sdeCmdPath, prepDir, modelFiles) {
  log("verbose", "  Flattening and preprocessing mdl files");
  const command = sdeCmdPath;
  const args = [];
  args.push("flatten");
  args.push("processed.mdl");
  args.push("--inputs");
  for (const path of modelFiles) {
    args.push(path);
  }
  const output = await context.spawnChild(prepDir, command, args, {
    logOutput: false,
    captureOutput: true,
    ignoreError: true
  });
  let flattenErrors = false;
  for (const msg of output.stderrMessages) {
    if (msg.includes("ERROR")) {
      flattenErrors = true;
      break;
    }
  }
  if (flattenErrors) {
    log("error", "There were errors reported when flattening the model:");
    for (const msg of output.stderrMessages) {
      const lines = msg.split("\n");
      for (const line of lines) {
        log("error", `  ${line}`);
      }
    }
    throw new Error(`Flatten command failed (code=${output.exitCode})`);
  } else if (output.exitCode !== 0) {
    throw new Error(`Flatten command failed (code=${output.exitCode})`);
  }
  await copyFile(joinPath3(prepDir, "build", "processed.mdl"), joinPath3(prepDir, "processed.mdl"));
}
async function generateC(context, sdeDir, sdeCmdPath, prepDir) {
  log("verbose", "  Generating C code");
  const command = sdeCmdPath;
  const gencArgs = ["generate", "--genc", "--spec", "spec.json", "processed"];
  await context.spawnChild(prepDir, command, gencArgs, {});
  const listArgs = ["generate", "--list", "--spec", "spec.json", "processed"];
  await context.spawnChild(prepDir, command, listArgs, {});
  const buildDir = joinPath3(prepDir, "build");
  const sdeCDir = joinPath3(sdeDir, "src", "c");
  const files = await readdir(sdeCDir);
  const copyOps = [];
  for (const file of files) {
    if (file.endsWith(".c") || file.endsWith(".h")) {
      copyOps.push(copyFile(joinPath3(sdeCDir, file), joinPath3(buildDir, file)));
    }
  }
  await Promise.all(copyOps);
}

// src/build/impl/hash-files.ts
import { join as joinPath4 } from "path";
import { hashElement } from "folder-hash";
import glob from "tiny-glob";
async function computeInputFilesHash(config) {
  const inputFiles = [];
  const specFile = joinPath4(config.prepDir, "spec.json");
  inputFiles.push(specFile);
  if (config.modelInputPaths && config.modelInputPaths.length > 0) {
    for (const globPath of config.modelInputPaths) {
      const paths = await glob(globPath, {
        cwd: config.rootDir,
        absolute: true,
        filesOnly: true
      });
      inputFiles.push(...paths);
    }
  } else {
    inputFiles.push(...config.modelFiles);
  }
  let hash = "";
  for (const inputFile of inputFiles) {
    const result = await hashElement(inputFile);
    hash += result.hash;
  }
  return hash;
}

// src/build/impl/build-once.ts
async function buildOnce(config, userConfig, plugins, options) {
  const stagedFiles = new StagedFiles(config.prepDir);
  const context = new BuildContext(config, stagedFiles, options.abortSignal);
  let modelSpec;
  try {
    modelSpec = await userConfig.modelSpec(context);
    if (modelSpec === void 0) {
      return err2(new Error("The model spec must be defined"));
    }
  } catch (e) {
    return err2(e);
  }
  for (const plugin of plugins) {
    if (plugin.preGenerate) {
      plugin.preGenerate(context, modelSpec);
    }
  }
  const specJson = {
    inputVarNames: modelSpec.inputs.map((input) => input.varName),
    outputVarNames: modelSpec.outputs.map((output) => output.varName),
    externalDatfiles: modelSpec.datFiles,
    ...modelSpec.options
  };
  const specPath = joinPath5(config.prepDir, "spec.json");
  await writeFile2(specPath, JSON.stringify(specJson, null, 2));
  const modelHashPath = joinPath5(config.prepDir, "model-hash.txt");
  let previousModelHash;
  if (existsSync3(modelHashPath)) {
    previousModelHash = readFileSync2(modelHashPath, "utf8");
  } else {
    previousModelHash = "NONE";
  }
  const inputFilesHash = await computeInputFilesHash(config);
  let needModelGen;
  if (options.forceModelGen === true) {
    needModelGen = true;
  } else {
    const hashMismatch = inputFilesHash !== previousModelHash;
    needModelGen = hashMismatch;
  }
  let succeeded = true;
  try {
    if (needModelGen) {
      await generateModel(context, plugins);
      writeFileSync3(modelHashPath, inputFilesHash);
    } else {
      log("info", "Skipping model code generation; already up-to-date");
    }
    for (const plugin of plugins) {
      if (plugin.postGenerate) {
        const pluginSucceeded = await plugin.postGenerate(context, modelSpec);
        if (!pluginSucceeded) {
          succeeded = false;
        }
      }
    }
    stagedFiles.copyChangedFiles();
    for (const plugin of plugins) {
      if (plugin.postBuild) {
        const pluginSucceeded = await plugin.postBuild(context, modelSpec);
        if (!pluginSucceeded) {
          succeeded = false;
        }
      }
    }
    if (config.mode === "development") {
      log("info", "Waiting for changes...\n");
      clearOverlay();
    }
  } catch (e) {
    if (e.message !== "ABORT") {
      writeFileSync3(modelHashPath, "");
      return err2(e);
    }
  }
  return ok2(succeeded);
}

// src/build/impl/watch.ts
import { basename } from "path";
import chokidar from "chokidar";
var BuildState = class {
  constructor() {
    this.abortController = new AbortController();
  }
};
function watch(config, userConfig, plugins) {
  const delay = 150;
  const changedPaths = /* @__PURE__ */ new Set();
  let currentBuildState;
  function performBuild() {
    clearOverlay();
    for (const path of changedPaths) {
      log("info", `Input file ${basename(path)} has been changed`);
    }
    changedPaths.clear();
    if (currentBuildState) {
      currentBuildState.abortController.abort();
      currentBuildState = void 0;
    }
    currentBuildState = new BuildState();
    const buildOptions = {
      abortSignal: currentBuildState.abortController.signal
    };
    buildOnce(config, userConfig, plugins, buildOptions).then((result) => {
      if (result.isErr()) {
        logError(result.error);
      }
    }).catch((e) => {
      logError(e);
    }).finally(() => {
      currentBuildState = void 0;
    });
  }
  function scheduleBuild(changedPath) {
    const schedule = changedPaths.size === 0;
    changedPaths.add(changedPath);
    if (schedule) {
      setTimeout(() => {
        performBuild();
      }, delay);
    }
  }
  let watchPaths;
  if (config.watchPaths && config.watchPaths.length > 0) {
    watchPaths = config.watchPaths;
  } else {
    watchPaths = config.modelFiles;
  }
  const watcher = chokidar.watch(watchPaths, {
    cwd: config.rootDir,
    awaitWriteFinish: {
      stabilityThreshold: 200
    }
  });
  watcher.on("change", (path) => {
    scheduleBuild(path);
  });
}

// src/build/build.ts
async function build(mode, options) {
  const configResult = await loadConfig(mode, options.config, options.sdeDir, options.sdeCmdPath);
  if (configResult.isErr()) {
    return err3(configResult.error);
  }
  const { userConfig, resolvedConfig } = configResult.value;
  if (options.logLevels !== void 0) {
    setActiveLevels(options.logLevels);
  }
  const messagesPath = joinPath6(resolvedConfig.prepDir, "messages.html");
  const overlayEnabled2 = mode === "development";
  setOverlayFile(messagesPath, overlayEnabled2);
  const plugins = userConfig.plugins || [];
  for (const plugin of plugins) {
    if (plugin.init) {
      await plugin.init(resolvedConfig);
    }
  }
  try {
    const plugins2 = userConfig.plugins || [];
    if (mode === "development") {
      const buildResult = await buildOnce(resolvedConfig, userConfig, plugins2, {});
      if (buildResult.isErr()) {
        return err3(buildResult.error);
      }
      for (const plugin of plugins2) {
        if (plugin.watch) {
          await plugin.watch(resolvedConfig);
        }
      }
      watch(resolvedConfig, userConfig, plugins2);
      return ok3({});
    } else {
      const buildResult = await buildOnce(resolvedConfig, userConfig, plugins2, {});
      if (buildResult.isErr()) {
        return err3(buildResult.error);
      }
      const allPluginsSucceeded = buildResult.value;
      const exitCode = allPluginsSucceeded ? 0 : 2;
      return ok3({ exitCode });
    }
  } catch (e) {
    return err3(e);
  }
}
export {
  build
};
//# sourceMappingURL=index.js.map
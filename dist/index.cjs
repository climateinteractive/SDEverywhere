var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  build: () => build
});
module.exports = __toCommonJS(src_exports);

// src/build/build.ts
var import_path7 = require("path");
var import_neverthrow3 = require("neverthrow");

// src/config/config-loader.ts
var import_fs = require("fs");
var import_path = require("path");
var import_url = require("url");
var import_neverthrow = require("neverthrow");
var import_meta = {};
async function loadConfig(mode, config, sdeDir, sdeCmdPath) {
  let userConfig;
  if (typeof config === "object") {
    userConfig = config;
  } else {
    let configPath;
    if (typeof config === "string") {
      configPath = config;
    } else {
      configPath = (0, import_path.join)(process.cwd(), "sde.config.js");
    }
    try {
      if (!(0, import_fs.existsSync)(configPath)) {
        return (0, import_neverthrow.err)(new Error(`Cannot find config file '${configPath}'`));
      }
      const configRelPath = relativeToSourcePath(configPath);
      const configModule = await import(configRelPath);
      userConfig = await configModule.config();
    } catch (e) {
      return (0, import_neverthrow.err)(new Error(`Failed to load config file '${configPath}': ${e.message}`));
    }
  }
  try {
    const resolvedConfig = resolveUserConfig(userConfig, mode, sdeDir, sdeCmdPath);
    return (0, import_neverthrow.ok)({
      userConfig,
      resolvedConfig
    });
  } catch (e) {
    return (0, import_neverthrow.err)(e);
  }
}
function resolveUserConfig(userConfig, mode, sdeDir, sdeCmdPath) {
  function expectDirectory(propName, path) {
    if (!(0, import_fs.existsSync)(path)) {
      throw new Error(`The configured ${propName} (${path}) does not exist`);
    } else if (!(0, import_fs.lstatSync)(path).isDirectory()) {
      throw new Error(`The configured ${propName} (${path}) is not a directory`);
    }
  }
  let rootDir;
  if (userConfig.rootDir) {
    rootDir = (0, import_path.resolve)(userConfig.rootDir);
    expectDirectory("rootDir", rootDir);
  } else {
    rootDir = process.cwd();
  }
  let prepDir;
  if (userConfig.prepDir) {
    prepDir = (0, import_path.resolve)(userConfig.prepDir);
  } else {
    prepDir = (0, import_path.resolve)(rootDir, "sde-prep");
  }
  (0, import_fs.mkdirSync)(prepDir, { recursive: true });
  const userModelFiles = userConfig.modelFiles;
  const modelFiles = [];
  for (const userModelFile of userModelFiles) {
    const modelFile = (0, import_path.resolve)(userModelFile);
    if (!(0, import_fs.existsSync)(modelFile)) {
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
  const srcDir = (0, import_path.dirname)((0, import_url.fileURLToPath)(import_meta.url));
  const relPath = (0, import_path.relative)(srcDir, filePath);
  return relPath.replaceAll("\\", "/");
}

// src/_shared/log.ts
var import_fs2 = require("fs");
var import_picocolors = __toESM(require("picocolors"), 1);
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
  (0, import_fs2.writeFileSync)(overlayFile, "");
}
function log(level, msg) {
  if (activeLevels.has(level)) {
    if (level === "error") {
      console.error(import_picocolors.default.red(msg));
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
  console.error(import_picocolors.default.red(`
ERROR: ${e.message}`));
  console.error(import_picocolors.default.dim(import_picocolors.default.red(`${trace}
`)));
  logToOverlay(`
ERROR: ${e.message}`, true);
  logToOverlay(`${trace}
`, true);
}
function writeOverlayFiles() {
  (0, import_fs2.writeFileSync)(overlayFile, overlayHtml);
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
var import_fs4 = require("fs");
var import_promises2 = require("fs/promises");
var import_path5 = require("path");
var import_neverthrow2 = require("neverthrow");

// src/context/spawn-child.ts
var import_cross_spawn = require("cross-spawn");
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
    childProc = (0, import_cross_spawn.spawn)(command, args, {
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
var import_fs3 = require("fs");
var import_path2 = require("path");
var StagedFiles = class {
  constructor(prepDir) {
    this.stagedFiles = [];
    this.baseStagedDir = (0, import_path2.join)(prepDir, "staged");
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
    const stagedDir = (0, import_path2.join)(this.baseStagedDir, srcDir);
    if (!(0, import_fs3.existsSync)(stagedDir)) {
      (0, import_fs3.mkdirSync)(stagedDir, { recursive: true });
    }
    return (0, import_path2.join)(stagedDir, srcFile);
  }
  writeStagedFile(srcDir, dstDir, filename, content) {
    const stagedFilePath = this.prepareStagedFile(srcDir, filename, dstDir, filename);
    (0, import_fs3.writeFileSync)(stagedFilePath, content);
  }
  getStagedFilePath(srcDir, srcFile) {
    return (0, import_path2.join)(this.baseStagedDir, srcDir, srcFile);
  }
  stagedFileExists(srcDir, srcFile) {
    const fullSrcPath = this.getStagedFilePath(srcDir, srcFile);
    return (0, import_fs3.existsSync)(fullSrcPath);
  }
  destinationFileExists(srcDir, srcFile) {
    const f = this.stagedFiles.find((f2) => f2.srcDir === srcDir && f2.srcFile === srcFile);
    if (f === void 0) {
      return false;
    }
    const fullDstPath = (0, import_path2.join)(f.dstDir, f.dstFile);
    return (0, import_fs3.existsSync)(fullDstPath);
  }
  copyChangedFiles() {
    log("info", "Copying changed files into place...");
    for (const f of this.stagedFiles) {
      this.copyStagedFile(f);
    }
    log("info", "Done copying files");
  }
  copyStagedFile(f) {
    if (!(0, import_fs3.existsSync)(f.dstDir)) {
      (0, import_fs3.mkdirSync)(f.dstDir, { recursive: true });
    }
    const fullSrcPath = this.getStagedFilePath(f.srcDir, f.srcFile);
    const fullDstPath = (0, import_path2.join)(f.dstDir, f.dstFile);
    const needsCopy = filesDiffer(fullSrcPath, fullDstPath);
    if (needsCopy) {
      log("verbose", `  Copying ${f.srcFile} to ${fullDstPath}`);
      (0, import_fs3.copyFileSync)(fullSrcPath, fullDstPath);
    }
    return needsCopy;
  }
};
function filesDiffer(aPath, bPath) {
  if ((0, import_fs3.existsSync)(aPath) && (0, import_fs3.existsSync)(bPath)) {
    const aSize = (0, import_fs3.statSync)(aPath).size;
    const bSize = (0, import_fs3.statSync)(bPath).size;
    if (aSize !== bSize) {
      return true;
    } else {
      const aBuf = (0, import_fs3.readFileSync)(aPath);
      const bBuf = (0, import_fs3.readFileSync)(bPath);
      return !aBuf.equals(bBuf);
    }
  } else {
    return true;
  }
}

// src/build/impl/gen-model.ts
var import_promises = require("fs/promises");
var import_path3 = require("path");
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
      const mdlPath = (0, import_path3.join)(prepDir, "processed.mdl");
      let mdlContent = await (0, import_promises.readFile)(mdlPath, "utf8");
      mdlContent = await plugin.postProcessMdl(context, mdlContent);
      await (0, import_promises.writeFile)(mdlPath, mdlContent);
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
      const cPath = (0, import_path3.join)(prepDir, "build", "processed.c");
      let cContent = await (0, import_promises.readFile)(cPath, "utf8");
      cContent = await plugin.postGenerateC(context, cContent);
      await (0, import_promises.writeFile)(cPath, cContent);
    }
  }
  const t1 = performance.now();
  const elapsed = ((t1 - t0) / 1e3).toFixed(1);
  log("info", `Done generating model (${elapsed}s)`);
}
async function preprocessMdl(context, sdeCmdPath, prepDir, modelFile) {
  log("verbose", "  Preprocessing mdl file");
  await (0, import_promises.copyFile)(modelFile, (0, import_path3.join)(prepDir, "processed.mdl"));
  const command = sdeCmdPath;
  const args = ["generate", "--preprocess", "processed.mdl"];
  await context.spawnChild(prepDir, command, args);
  await (0, import_promises.copyFile)((0, import_path3.join)(prepDir, "build", "processed.mdl"), (0, import_path3.join)(prepDir, "processed.mdl"));
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
  await (0, import_promises.copyFile)((0, import_path3.join)(prepDir, "build", "processed.mdl"), (0, import_path3.join)(prepDir, "processed.mdl"));
}
async function generateC(context, sdeDir, sdeCmdPath, prepDir) {
  log("verbose", "  Generating C code");
  const command = sdeCmdPath;
  const gencArgs = ["generate", "--genc", "--spec", "spec.json", "processed"];
  await context.spawnChild(prepDir, command, gencArgs, {});
  const listArgs = ["generate", "--list", "--spec", "spec.json", "processed"];
  await context.spawnChild(prepDir, command, listArgs, {});
  const buildDir = (0, import_path3.join)(prepDir, "build");
  const sdeCDir = (0, import_path3.join)(sdeDir, "src", "c");
  const files = await (0, import_promises.readdir)(sdeCDir);
  const copyOps = [];
  for (const file of files) {
    if (file.endsWith(".c") || file.endsWith(".h")) {
      copyOps.push((0, import_promises.copyFile)((0, import_path3.join)(sdeCDir, file), (0, import_path3.join)(buildDir, file)));
    }
  }
  await Promise.all(copyOps);
}

// src/build/impl/hash-files.ts
var import_path4 = require("path");
var import_folder_hash = require("folder-hash");
var import_tiny_glob = __toESM(require("tiny-glob"), 1);
async function computeInputFilesHash(config) {
  const inputFiles = [];
  const specFile = (0, import_path4.join)(config.prepDir, "spec.json");
  inputFiles.push(specFile);
  if (config.modelInputPaths && config.modelInputPaths.length > 0) {
    for (const globPath of config.modelInputPaths) {
      const paths = await (0, import_tiny_glob.default)(globPath, {
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
    const result = await (0, import_folder_hash.hashElement)(inputFile);
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
      return (0, import_neverthrow2.err)(new Error("The model spec must be defined"));
    }
  } catch (e) {
    return (0, import_neverthrow2.err)(e);
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
  const specPath = (0, import_path5.join)(config.prepDir, "spec.json");
  await (0, import_promises2.writeFile)(specPath, JSON.stringify(specJson, null, 2));
  const modelHashPath = (0, import_path5.join)(config.prepDir, "model-hash.txt");
  let previousModelHash;
  if ((0, import_fs4.existsSync)(modelHashPath)) {
    previousModelHash = (0, import_fs4.readFileSync)(modelHashPath, "utf8");
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
      (0, import_fs4.writeFileSync)(modelHashPath, inputFilesHash);
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
      (0, import_fs4.writeFileSync)(modelHashPath, "");
      return (0, import_neverthrow2.err)(e);
    }
  }
  return (0, import_neverthrow2.ok)(succeeded);
}

// src/build/impl/watch.ts
var import_path6 = require("path");
var import_chokidar = __toESM(require("chokidar"), 1);
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
      log("info", `Input file ${(0, import_path6.basename)(path)} has been changed`);
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
  const watcher = import_chokidar.default.watch(watchPaths, {
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
    return (0, import_neverthrow3.err)(configResult.error);
  }
  const { userConfig, resolvedConfig } = configResult.value;
  if (options.logLevels !== void 0) {
    setActiveLevels(options.logLevels);
  }
  const messagesPath = (0, import_path7.join)(resolvedConfig.prepDir, "messages.html");
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
        return (0, import_neverthrow3.err)(buildResult.error);
      }
      for (const plugin of plugins2) {
        if (plugin.watch) {
          await plugin.watch(resolvedConfig);
        }
      }
      watch(resolvedConfig, userConfig, plugins2);
      return (0, import_neverthrow3.ok)({});
    } else {
      const buildResult = await buildOnce(resolvedConfig, userConfig, plugins2, {});
      if (buildResult.isErr()) {
        return (0, import_neverthrow3.err)(buildResult.error);
      }
      const allPluginsSucceeded = buildResult.value;
      const exitCode = allPluginsSucceeded ? 0 : 2;
      return (0, import_neverthrow3.ok)({ exitCode });
    }
  } catch (e) {
    return (0, import_neverthrow3.err)(e);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  build
});
//# sourceMappingURL=index.cjs.map
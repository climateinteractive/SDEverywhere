// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Browser-side benchmark driver.  The Node-side harness (`bench.mjs`) compiles the models,
// serves the artifacts, and reads the results that this module posts back.
//

import { createGpuModel } from './gpu-runner.js'
import { getJsModelFunctions } from '/runtime.js'

/**
 * Instantiate a WebAssembly model built the way SDEverywhere normally builds one (production
 * C code generator, then Emscripten), and return a function that performs one full ensemble.
 *
 * The model is run once per ensemble member, which is what an SDE application does today.
 * Input and output buffers are allocated once and reused, so the measurement is the model's
 * compute cost plus the wasm heap copy, not repeated allocation.
 *
 * @param {Object} c The benchmark case.
 * @return {Promise<Function>} The runner.
 */
async function createWasmModel(c) {
  const url = URL.createObjectURL(new Blob([c.wasmJsCode], { type: 'text/javascript' }))
  const mod = await import(url)
  const Module = await mod.default()

  const getNumber = name => Module.cwrap(name, 'number', [])()
  const startTime = getNumber('getInitialTime')
  const endTime = getNumber('getFinalTime')
  const saveFreq = getNumber('getSaveper')
  const numSavePoints = Math.round((endTime - startTime) / saveFreq) + 1
  const runModel = Module.cwrap('runModelWithBuffers', null, [
    'number',
    'number',
    'number',
    'number',
    'number',
    'number'
  ])

  const numOutputs = c.numOutputs
  const inputsAddr = c.numInputs > 0 ? Module._malloc(c.numInputs * 8) : 0
  const outputsAddr = Module._malloc(numOutputs * numSavePoints * 8)
  const outputElems = numOutputs * numSavePoints

  return inputs => {
    for (let run = 0; run < c.numRuns; run++) {
      if (c.numInputs > 0) {
        Module.HEAPF64.set(inputs.subarray(run * c.numInputs, (run + 1) * c.numInputs), inputsAddr / 8)
      }
      runModel(inputsAddr, 0, outputsAddr, 0, 0, 0)
    }
    return Module.HEAPF64.subarray(outputsAddr / 8, outputsAddr / 8 + outputElems)
  }
}

/**
 * Instantiate a model produced by SDE's production JS code generator and return a function
 * that performs one full ensemble (`numRuns` sequential runs, as an SDE user would today).
 *
 * @param {Object} c The benchmark case.
 * @return {Promise<Function>} The runner.
 */
async function createProductionModel(c) {
  const url = URL.createObjectURL(new Blob([c.prodJsCode], { type: 'text/javascript' }))
  const mod = await import(url)
  const model = await mod.default()
  const fns = getJsModelFunctions()
  model.setModelFunctions(fns)

  const initialTime = model.getInitialTime()
  const finalTime = model.getFinalTime()
  const timeStep = model.getTimeStep()
  const saveFreq = model.getSaveFreq()
  const numSavePoints = Math.round((finalTime - initialTime) / saveFreq) + 1
  const numOutputs = model.outputVarIds.length
  const outputs = new Float64Array(numOutputs * numSavePoints)
  const lastStep = Math.round((finalTime - initialTime) / timeStep)

  return inputs => {
    for (let run = 0; run < c.numRuns; run++) {
      let time = initialTime
      model.setTime(time)
      fns.setContext({ timeStep, currentTime: time })
      model.initConstants()
      if (c.numInputs > 0) {
        model.setInputs(i => inputs[run * c.numInputs + i])
      }
      model.initLevels()
      let step = 0
      let savePointIndex = 0
      while (step <= lastStep) {
        model.evalAux()
        if (time % saveFreq < 1e-6) {
          let outputVarIndex = 0
          model.storeOutputs(value => {
            outputs[outputVarIndex * numSavePoints + savePointIndex] = value
            outputVarIndex++
          })
          savePointIndex++
        }
        if (step === lastStep) {
          break
        }
        model.evalLevels()
        time += timeStep
        model.setTime(time)
        fns.setContext({ timeStep, currentTime: time })
        step++
      }
    }
    return outputs
  }
}

/**
 * Time one call of `fn` in milliseconds.
 *
 * Fast cases run well below the timer's effective resolution, so the workload is repeated
 * until a batch takes at least `minBatchMs`, and the best batch of `reps` is reported.
 *
 * @param {number} reps The number of batches to run.
 * @param {Function} fn The workload.
 * @return {Promise<number>} The best per-call time in milliseconds.
 */
async function best(reps, fn) {
  const minBatchMs = 50
  // Warm up (and let the JIT settle) before calibrating
  await fn()
  await fn()

  let iters = 1
  for (;;) {
    const t0 = performance.now()
    for (let i = 0; i < iters; i++) {
      await fn()
    }
    const dt = performance.now() - t0
    if (dt >= minBatchMs || iters >= 1e7) {
      break
    }
    iters = Math.max(iters * 2, Math.ceil((iters * minBatchMs) / Math.max(dt, 0.02)))
  }

  let bestMs = Infinity
  for (let r = 0; r < reps; r++) {
    const t0 = performance.now()
    for (let i = 0; i < iters; i++) {
      await fn()
    }
    bestMs = Math.min(bestMs, (performance.now() - t0) / iters)
  }
  return bestMs
}

/**
 * Compare two output arrays and return the maximum relative difference.
 *
 * The two arrays may interleave a different number of ensemble members, so each is walked
 * with its own stride; only the first member is compared when the strides differ.
 *
 * @param {ArrayLike<number>} a The reference values.
 * @param {ArrayLike<number>} b The values under test.
 * @param {number} strideA The ensemble stride of `a`.
 * @param {number} strideB The ensemble stride of `b`.
 * @param {number} length The number of reference values to compare.
 * @return {number} The maximum relative difference.
 */
function maxRelDiff(a, b, strideA, strideB, length) {
  let maxRel = 0
  for (let i = 0; i < length; i++) {
    const e = a[i * strideA]
    const d = Math.abs(b[i * strideB] - e)
    const rel = Math.abs(e) > 1e-9 ? d / Math.abs(e) : d
    if (rel > maxRel) {
      maxRel = rel
    }
  }
  return maxRel
}

async function main() {
  const results = []
  const log = msg => console.log(`[bench] ${msg}`)

  const adapter = await navigator.gpu?.requestAdapter()
  if (!adapter) {
    document.title = 'no-webgpu'
    window.__benchResults = { error: 'WebGPU adapter not available' }
    return
  }
  const device = await adapter.requestDevice({
    requiredLimits: {
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxBufferSize: adapter.limits.maxBufferSize,
      maxComputeWorkgroupsPerDimension: adapter.limits.maxComputeWorkgroupsPerDimension
    }
  })
  device.addEventListener('uncapturederror', e => log(`uncaptured error: ${e.error.message}`))

  const cases = await (await fetch(`./cases.json${location.search}`)).json()
  // Publish results incrementally so the harness can report (and survive) a long sweep
  window.__benchPartial = results

  for (const c of cases) {
    log(`=== ${c.label} ===`)
    const entry = { label: c.label, meta: c.meta }
    try {
      // CPU baselines: the generated flat-buffer JS model, in f64 and f32
      const factory = new Function(c.jsCode)()
      const inputs = new Float64Array(c.numInputs * c.numRuns)
      for (let i = 0; i < inputs.length; i++) {
        inputs[i] = c.inputValues[i % c.inputValues.length]
      }

      if (c.wasmJsCode) {
        const wasm = await createWasmModel(c)
        entry.wasmMs = await best(c.reps, () => wasm(inputs))
      }

      if (c.prodJsCode) {
        const prod = await createProductionModel(c)
        entry.prodJsMs = await best(c.reps, () => prod(inputs))
      }

      // The flat-buffer JS model is both a CPU data point and the f64 correctness reference.
      // For very large models it is far too slow to time (it calls one function per subscript
      // cell), so `referenceOnly` runs it once, for a single ensemble member, purely as the
      // reference.
      let reference
      let referenceStride
      if (c.referenceOnly) {
        const ref = factory(1, Int32Array.from(c.lookupDir), Float64Array.from(c.lookupData), Float64Array)
        ref.runAll(inputs.subarray(0, c.numInputs))
        reference = Float64Array.from(ref.OUT)
        referenceStride = 1
      } else {
        const jsF64 = factory(c.numRuns, Int32Array.from(c.lookupDir), Float64Array.from(c.lookupData), Float64Array)
        entry.jsF64Ms = await best(c.reps, () => jsF64.runAll(inputs))
        reference = Float64Array.from(jsF64.OUT)
        referenceStride = c.numRuns

        const jsF32 = factory(c.numRuns, Int32Array.from(c.lookupDir), Float32Array.from(c.lookupData), Float32Array)
        entry.jsF32Ms = await best(c.reps, () => jsF32.runAll(inputs))
        entry.jsF32MaxRel = maxRelDiff(reference, jsF32.OUT, 1, 1, reference.length)
      }

      // GPU
      const gpu = await createGpuModel(device, {
        code: c.wgslCode,
        numCells: c.numCells,
        numRuns: c.numRuns,
        table: Uint32Array.from(c.table),
        lookupDir: Int32Array.from(c.lookupDir),
        lookupData: Float32Array.from(c.lookupData),
        numOutputs: c.numOutputs,
        savePointCount: c.savePointCount,
        numSteps: c.numSteps,
        stepsPerSave: c.stepsPerSave,
        numInputs: c.numInputs,
        plan: c.plan
      })
      gpu.setInputs(Float32Array.from(inputs))
      entry.dispatchCounts = gpu.dispatchCounts

      for (const strategy of c.strategies) {
        // Warm up (the first submit includes lazy pipeline work inside the driver) and
        // check correctness against the f64 CPU result
        const warm = await gpu.run(strategy, true)
        const check = maxRelDiff(
          reference,
          warm.outputs,
          referenceStride,
          c.numRuns,
          reference.length / referenceStride
        )
        let lastEncode = 0
        let lastGpu = 0
        const totalMs = await best(c.reps, async () => {
          const r = await gpu.run(strategy, false)
          lastEncode = r.encodeMs
          lastGpu = r.gpuMs
        })
        // Also measure end to end, i.e. including mapping the output buffer back to the
        // CPU.  For large ensembles the output buffer is tens of megabytes, so this is a
        // real part of the cost that the submit-only timing above does not capture.
        const withReadbackMs = await best(c.reps, () => gpu.run(strategy, true))
        entry[strategy] = { totalMs, withReadbackMs, gpuMs: lastGpu, encodeMs: lastEncode, maxRel: check }
        log(
          `${strategy}: ${totalMs.toFixed(3)}ms (readback ${withReadbackMs.toFixed(2)}ms, ` +
            `encode ${lastEncode.toFixed(2)}ms) maxRel=${check.toExponential(2)}`
        )
      }
      gpu.destroy()
    } catch (e) {
      entry.error = `${e.message}`
      log(`error: ${e.message}`)
    }
    results.push(entry)
  }

  const info = adapter.info || {}
  window.__benchResults = {
    adapter: {
      vendor: info.vendor,
      architecture: info.architecture,
      device: info.device,
      description: info.description
    },
    results
  }
  document.title = 'done'
}

main().catch(e => {
  window.__benchResults = { error: `${e.stack || e.message}` }
  document.title = 'done'
})

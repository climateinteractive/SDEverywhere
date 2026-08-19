// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Browser-side WebGPU driver for the generated shaders.
//
// Both strategies share one shader module and one bind group; they differ only in what is
// encoded into the command buffer:
//
//   layered   - one dispatch per topological layer per time step, all encoded up front and
//               submitted as a single command buffer
//   perThread - a single dispatch; the whole simulation (including the time loop) runs
//               inside the shader with one thread per model run
//

const WORKGROUP_SIZE = 64
const WG_SIZE = 256

/** Round a byte length up so that it satisfies the largest element stride in use (vec4). */
function align4(n) {
  return Math.max(16, Math.ceil(n / 16) * 16)
}

/**
 * Create a GPU model instance from a compiled artifact bundle.
 *
 * @param {GPUDevice} device The WebGPU device.
 * @param {Object} artifact The compiled artifact (shader code, tables, sizes).
 * @return {Promise<Object>} The GPU model instance.
 */
export async function createGpuModel(device, artifact) {
  const {
    code,
    numCells,
    numRuns,
    table,
    lookupDir,
    lookupData,
    numOutputs,
    savePointCount,
    numSteps,
    stepsPerSave,
    numInputs,
    plan
  } = artifact

  device.pushErrorScope('validation')
  const module = device.createShaderModule({ code })
  const compilationInfo = await module.getCompilationInfo()
  const errors = compilationInfo.messages.filter(m => m.type === 'error')
  if (errors.length > 0) {
    throw new Error(`WGSL compile error: ${errors.map(m => `${m.lineNum}:${m.linePos} ${m.message}`).join('; ')}`)
  }

  const mkBuffer = (name, byteLength, usage, data) => {
    const buf = device.createBuffer({ label: name, size: align4(byteLength), usage })
    if (data) {
      device.queue.writeBuffer(buf, 0, data)
    }
    return buf
  }

  const S = GPUBufferUsage.STORAGE
  const vBuf = mkBuffer('V', numCells * numRuns * 4, S | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC)
  const dirBuf = mkBuffer('LK_DIR', lookupDir.byteLength, S | GPUBufferUsage.COPY_DST, lookupDir)
  const dataBuf = mkBuffer('LK_DATA', lookupData.byteLength, S | GPUBufferUsage.COPY_DST, lookupData)
  const wgtBuf = mkBuffer('WGT', table.byteLength, S | GPUBufferUsage.COPY_DST, table)
  const outSize = Math.max(1, savePointCount * numOutputs * numRuns) * 4
  const outBuf = mkBuffer('OUT', outSize, S | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST)
  const inpBuf = mkBuffer('INP', Math.max(1, numInputs * numRuns) * 4, S | GPUBufferUsage.COPY_DST)
  const readBuf = device.createBuffer({
    size: align4(outSize),
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  })

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [0, 1, 2, 3, 4, 5].map(binding => ({
      binding,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: binding === 0 || binding === 4 ? 'storage' : 'read-only-storage' }
    }))
  })
  const layout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] })
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [vBuf, dirBuf, dataBuf, wgtBuf, outBuf, inpBuf].map((buffer, binding) => ({
      binding,
      resource: { buffer }
    }))
  })

  const pipelines = new Map()
  const pipelineFor = entryPoint => {
    let p = pipelines.get(entryPoint)
    if (p === undefined) {
      p = device.createComputePipeline({ layout, compute: { module, entryPoint } })
      pipelines.set(entryPoint, p)
    }
    return p
  }

  // Create every pipeline up front so that shader compilation is not part of the timing
  const layerEntryPoints = []
  for (const [passName, layers] of Object.entries(plan)) {
    layers.forEach((p, n) => {
      layerEntryPoints.push({ passName, n, entryPoint: `${passName}_${n}`, count: p.count })
      pipelineFor(`${passName}_${n}`)
    })
  }
  for (const name of ['setTime', 'advanceTime', 'applyInputs', 'storeOutputs', 'runAll', 'runWorkgroup']) {
    pipelineFor(name)
  }

  const err = await device.popErrorScope()
  if (err) {
    throw new Error(`WebGPU validation error: ${err.message}`)
  }

  const runDispatches = numWorkgroups => Math.max(1, numWorkgroups)
  const layersOf = passName => layerEntryPoints.filter(e => e.passName === passName)

  /** Encode a complete `layered` run into a command buffer. */
  function encodeLayered() {
    const enc = device.createCommandEncoder()
    const pass = enc.beginComputePass()
    const dispatch = (entryPoint, workgroups) => {
      pass.setPipeline(pipelineFor(entryPoint))
      pass.setBindGroup(0, bindGroup)
      pass.dispatchWorkgroups(runDispatches(workgroups))
    }
    const runWgs = Math.ceil(numRuns / WORKGROUP_SIZE)

    dispatch('setTime', runWgs)
    for (const l of layersOf('initConstants')) dispatch(l.entryPoint, l.count)
    if (numInputs > 0) dispatch('applyInputs', runWgs)
    for (const l of layersOf('initLevels')) dispatch(l.entryPoint, l.count)

    const outWgs = Math.ceil((numOutputs * numRuns) / WORKGROUP_SIZE)
    for (let step = 0; step <= numSteps; step++) {
      for (const l of layersOf('evalAux')) dispatch(l.entryPoint, l.count)
      if (step % stepsPerSave === 0 && numOutputs > 0) {
        dispatch('storeOutputs', outWgs)
      }
      if (step === numSteps) break
      for (const l of layersOf('evalLevels')) dispatch(l.entryPoint, l.count)
      dispatch('advanceTime', runWgs)
    }
    pass.end()
    enc.copyBufferToBuffer(outBuf, 0, readBuf, 0, align4(outSize))
    return enc.finish()
  }

  /** Encode a single-dispatch run (`perThread` or `perWorkgroup`) into a command buffer. */
  function encodeSingleDispatch(strategy) {
    const enc = device.createCommandEncoder()
    const pass = enc.beginComputePass()
    if (strategy === 'perThread') {
      pass.setPipeline(pipelineFor('runAll'))
      pass.setBindGroup(0, bindGroup)
      pass.dispatchWorkgroups(Math.ceil(numRuns / WORKGROUP_SIZE))
    } else {
      // One workgroup per run; the threads of a workgroup cooperate on each layer
      pass.setPipeline(pipelineFor('runWorkgroup'))
      pass.setBindGroup(0, bindGroup)
      pass.dispatchWorkgroups(numRuns)
    }
    pass.end()
    enc.copyBufferToBuffer(outBuf, 0, readBuf, 0, align4(outSize))
    return enc.finish()
  }

  const dispatchCounts = {
    layered:
      1 +
      layersOf('initConstants').length +
      (numInputs > 0 ? 1 : 0) +
      layersOf('initLevels').length +
      (numSteps + 1) * layersOf('evalAux').length +
      Math.floor(numSteps / stepsPerSave + 1) +
      numSteps * (layersOf('evalLevels').length + 1),
    perThread: 1,
    perWorkgroup: 1
  }

  return {
    dispatchCounts,
    setInputs(inputs) {
      if (numInputs > 0) {
        device.queue.writeBuffer(inpBuf, 0, inputs)
      }
    },
    /**
     * Run the model with the given strategy.
     *
     * @param {'layered' | 'perThread' | 'perWorkgroup'} strategy The execution strategy.
     * @param {boolean} readOutputs Whether to map and return the output buffer.
     * @return {Promise<Object>} Timings (and outputs, if requested).
     */
    async run(strategy, readOutputs) {
      const encodeStart = performance.now()
      const commands = strategy === 'layered' ? encodeLayered() : encodeSingleDispatch(strategy)
      const encodeMs = performance.now() - encodeStart

      const submitStart = performance.now()
      device.queue.submit([commands])
      await device.queue.onSubmittedWorkDone()
      const gpuMs = performance.now() - submitStart

      let outputs
      if (readOutputs) {
        await readBuf.mapAsync(GPUMapMode.READ)
        outputs = new Float32Array(readBuf.getMappedRange().slice(0, outSize))
        readBuf.unmap()
      }
      return { encodeMs, gpuMs, totalMs: encodeMs + gpuMs, outputs }
    },
    destroy() {
      for (const b of [vBuf, dirBuf, dataBuf, wgtBuf, outBuf, inpBuf, readBuf]) {
        b.destroy()
      }
    }
  }
}

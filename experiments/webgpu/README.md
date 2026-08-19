# WebGPU backend prototype

An experiment for [issue #319](https://github.com/climateinteractive/SDEverywhere/issues/319):
_how much speedup can a WebGPU backend actually deliver for SDEverywhere models?_

This directory is **not** part of the published packages and is not wired into the pnpm
workspace. It is a self-contained prototype that reuses SDE's real parse/analyze phases and
adds an experimental flat-buffer code generator that emits both WGSL and JavaScript.

## TL;DR

Measured on an Apple M1 Max, against **SDE's C backend compiled with Emscripten `-O3`** (the
fastest backend SDEverywhere ships; it is itself 2–8× faster than the JS backend):

- **One run of a model is not faster on the GPU** — it is 3–120× slower, and even a model
  100,000 subscript elements wide only reaches parity.
- **Many runs of a model are much faster** — 3× to 123×, because the cost of a WebGPU run
  barely changes as ensemble members are added (SIR: 2.3 ms for 1 run, 5.4 ms for 16,384
  runs). Crossover against WASM is ~50–200 runs.
- For an En-ROADS-scale model, how much you win depends mostly on **how many variables you
  capture**: 4000 runs capturing all 350 outputs is 5.7× faster than WASM, but capturing the
  10 an objective function needs is 14.3× — and readback drops from 99 ms to 2.8 ms.
- The practical opportunity is therefore batch work — calibration, sensitivity analysis,
  scenario sweeps, `plugin-check` — not the interactive slider path.

Full numbers, method, and caveats: [RESULTS.md](./RESULTS.md).

## What is here

```
src/analyze.mjs    wrapper around SDE's parse + analyze phases
src/ir.mjs         flat-buffer layout + topological layering of the variable graph
src/gen-instr.mjs  per-variable code generator (emits either WGSL or JS from one place)
src/gen-wgsl.mjs   assembles a complete WGSL compute shader (3 execution strategies)
src/gen-js.mjs     assembles a complete JS model (the CPU baseline)
src/compile.mjs    end-to-end driver
src/build-wasm.mjs generate C with SDE's C backend and compile it with Emscripten -O3

validate.mjs       compare the flat-buffer JS model against SDE's production JS model
validate-all.mjs   run that comparison over every model in `models/`
debug-model.mjs    per-output diff, plus `DUMP_JS=1` / `DUMP_WGSL=1` source dumps
bench.mjs          shape/ensemble benchmark sweep
memory.mjs         memory + readback experiment at En-ROADS scale
bench/             shared harness, browser-side benchmark, and WebGPU driver
```

## Running it

```sh
# Check the prototype's code generator against SDE's production JS code generator
node validate-all.mjs

# Compare one model in detail
node validate.mjs ../../models/sir/sir.mdl "Infectious Population I"

# Run the benchmark sweep (needs Chrome; uses the repo's Playwright install)
node bench.mjs
ONLY=sir VERBOSE=1 node bench.mjs      # one case, with browser console output

# Memory and readback at En-ROADS scale (350 outputs x 111 save points x N runs)
node memory.mjs
```

The WASM baseline needs an Emscripten SDK. The scripts look for one at `../../../emsdk`
(i.e. a sibling of the repo) or `$EMSDK_DIR`; builds are cached under `.wasm-cache`.

## Design

### One buffer, not one array per variable

The production C and JS backends declare one variable (or nested array) per Vensim variable.
The GPU needs everything in one storage buffer, so `ir.mjs` assigns each variable a slot
range in a single flat buffer and each read/write becomes an index computation. Concretely,
`a[DimA, DimB]` at offset 240 with dimension sizes `(3, 12)` becomes:

```wgsl
V[(240u + i * 12u + j) * R + run] = ...;
```

`R` is the **ensemble size** — the number of model runs being simulated concurrently — and
it is the _minor_ index. That ordering matters: GPU threads are assigned adjacent run
indices, so adjacent threads touch adjacent memory and the hardware coalesces the access
into one transaction. With `R = 1` the layout degenerates to a plain flat buffer.

### Layering

`Model.auxVars()` gives a linear evaluation order. The prototype re-derives the _topological
layers_ from the reference graph: every variable in layer _n_ depends only on variables in
layers `< n`, so all of a layer's variable instances (and all of their subscript cells, and
all ensemble members) can be evaluated in parallel. Layer count is the model's serial depth
per time step, and it is the hard limit on intra-run parallelism.

### Three execution strategies

The same generated per-variable functions are driven three different ways:

| Strategy       | Shape                                                                                     | Parallelism                            | Overhead                            |
| -------------- | ----------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------- |
| `layered`      | one dispatch per layer per time step, all encoded into a single command buffer            | every (variable, cell, run) in a layer | ~3 µs per dispatch × layers × steps |
| `perWorkgroup` | one workgroup per run; whole time loop in the shader, `workgroupBarrier()` between layers | up to 256 threads per run × runs       | barrier per layer (cheap)           |
| `perThread`    | one thread per run; whole simulation in the shader, no barriers at all                    | runs only                              | none                                |

`perThread` is the interesting one for SD models: because every thread executes exactly the
same instruction stream, there is zero warp divergence and the GPU runs at full SIMD width.
It cannot help a single run, but it makes ensembles nearly free.

## Correctness

`validate-all.mjs` runs both the prototype's JS model and SDE's production JS model over
every model in `models/` and compares all outputs at all save points.

Anything that agrees to `f64` exactly is a model whose subscript layout, layering, and
expression translation the prototype gets right. The `f32` column is the error introduced by
single-precision arithmetic, which is what the GPU is limited to (WGSL has `f32` and
optionally `f16`; there is no `f64`).

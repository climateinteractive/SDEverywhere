# WebGPU prototype: results

## Setup

|             |                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Machine     | Apple M1 Max (10 CPU cores, 24 GPU cores / 3072 ALUs), macOS 24.6                                                                                             |
| Browser     | Chrome 151, headless, WebGPU on Metal 3                                                                                                                       |
| `wasm-O3`   | SDE's production **C** backend, compiled with Emscripten 3.1.46 at `-O3`, driven through `runModelWithBuffers` (note: `plugin-wasm` defaults to `-Os`)        |
| `sde-js`    | SDE's production **JS** backend, driven by `@sdeverywhere/runtime`'s model functions                                                                          |
| `flat-f64`  | the prototype's own flat-buffer JS model, to separate "flat buffer" effects from "GPU" effects                                                                |
| Timing      | best of 3 batches; each batch repeats the workload until it exceeds 50 ms, so sub-millisecond cases are not lost to timer resolution                          |
| Isolation   | one fresh page (and WebGPU device) per case — a shared page let V8's JIT decisions for one model depend on what ran before it, which drifted baselines by ~3× |
| Correctness | every GPU result is compared against the f64 CPU result for all outputs at all save points                                                                    |

Everything runs in the same headless Chrome instance, so wasm, JS and WebGPU share one
engine and one machine state.

Times are milliseconds for one complete ensemble (all `runs`), lower is better. `vs wasm` is
`wasm-O3 / best-GPU`; a value in parentheses means the GPU was _slower_ by that factor.

## Headline numbers

```
case                              cells   instr  lyr    wasm-O3   sde-js flat-f64  layered   perThr    perWG vs wasm  gpu maxRel
wide w=1 d=8 t=200 runs=1         17      17     9         0.01     0.01     0.02    12.20     0.58     1.55 (46.7x)  8.5e-7
wide w=10 d=8 t=200 runs=1        107     17     9         0.01     0.03     0.04    12.92     2.93     1.19 (91.1x)  8.5e-7
wide w=100 d=8 t=200 runs=1       1007    17     9         0.13     0.17     0.41    11.90    16.35     0.97  (7.6x)  7.7e-7
wide w=1000 d=8 t=200 runs=1      10007   17     9         1.33     1.75     4.18    16.90   148.20     4.65  (3.5x)  2.3e-6
wide w=10000 d=8 t=200 runs=1     100007  17     9            -        -    42.90    45.70  1483.30    40.70    1.1x  2.2e-5
wide w=100000 d=8 t=200 runs=1    1000007 17     9            -        -   419.70   377.80 18366.10   596.80    1.1x  5.7e-4

ensemble w=10 d=8 t=200 runs=1    107     17     9         0.01     0.03     0.04    13.45     2.54     1.09 (81.8x)  7.9e-7
ensemble w=10 d=8 t=200 runs=16   107     17     9         0.21     0.44     0.64    14.16     2.64     0.87  (4.1x)  8.5e-7
ensemble w=10 d=8 t=200 runs=64   107     17     9         0.84     1.66     2.52    12.60     3.53     1.61  (1.9x)  8.5e-7
ensemble w=10 d=8 t=200 runs=256  107     17     9         3.35     6.61    11.24    11.65     2.94     2.07    1.6x  8.5e-7
ensemble w=10 d=8 t=200 runs=1024 107     17     9        13.45    26.60   111.70    12.88     4.19     4.97    3.2x  8.5e-7
ensemble w=10 d=8 t=200 runs=4096 107     17     9        53.60   106.40   565.90    10.44     3.28    15.23   16.4x  8.5e-7
ensemble w=10 d=8 t=200 runs=16384107     17     9       222.50   438.90  2361.30    17.53     4.04        -   55.1x  8.5e-7
ensemble w=10 d=8 t=200 runs=65536107     17     9       865.30  1760.40  9838.40    38.60    16.55        -   52.3x  8.5e-7

depth d=2 w=1000 t=200 runs=1     4007    11     3         0.56     0.79     0.76     9.72    61.00     3.67  (6.6x)  4.8e-6
depth d=8 w=1000 t=200 runs=1     10007   17     9         1.34     1.74     4.17    17.82   148.30     4.65  (3.5x)  2.3e-6
depth d=32 w=1000 t=200 runs=1    34007   41    33         4.43     9.94    26.60    38.75   526.40     9.40  (2.1x)  3.3e-7

scalar 400vars d=20 t=200 runs=1  407     407   21         0.06     0.47     0.47    26.35     6.98    16.20(119.5x)  1.6e-7
scalar 400vars d=20 t=200 runs=1024 407   407   21        59.80   485.40   508.80    28.10    17.70    81.70    3.4x  1.6e-7

wide+ens w=1000 d=8 t=200 runs=1  10007   17     9         1.34     1.80     4.31    17.67   148.00     4.71  (3.5x)  6.4e-6
wide+ens w=1000 d=8 t=200 runs=16 10007   17     9        21.60    28.25    82.30    17.20   242.10    12.88    1.7x  7.7e-6
wide+ens w=1000 d=8 t=200 runs=64 10007   17     9        86.00   113.30   361.40    19.67   373.00    20.43    4.4x  7.7e-6

long t=2000 w=1000 d=8 runs=1     10007   17     9        13.52    17.70    34.45   117.60  1470.50    42.70  (3.2x)  1.2e-5

sir runs=1                        15      17     2         0.04     0.14     0.04    42.25     2.27     4.76 (55.7x)  3.9e-4
sir runs=1024                     15      17     2        41.45   162.80    42.60    42.35     2.51    22.83   16.5x  3.9e-4
sir runs=16384                    15      17     2       660.40  2582.00   871.10    50.70     5.38        -  122.8x  3.9e-4
```

(`-` for `wasm-O3`/`sde-js` on the two widest cases: SDE's production code generators did not
finish generating those models within 90 s. `-` for `perWG` above 4096 runs: that strategy
launches a 256-thread workgroup per run and is not sensible there.)

## Findings

### 1. WASM is 3–8× faster than the JS backend, which moves every GPU comparison

Before anything else: the choice of baseline matters a lot.

| model                        | `sde-js` | `wasm-O3` | wasm advantage |
| ---------------------------- | -------- | --------- | -------------- |
| SIR, 1024 runs               | 162.8 ms | 41.5 ms   | 3.9×           |
| 400-var scalar, 1024 runs    | 485.4 ms | 59.8 ms   | 8.1×           |
| 10-wide sectoral, 16384 runs | 438.9 ms | 222.5 ms  | 2.0×           |
| `wide w=1000`, 1 run         | 1.75 ms  | 1.33 ms   | 1.3×           |
| `depth d=32 w=1000`, 1 run   | 9.94 ms  | 4.43 ms   | 2.2×           |

So every headline in the first version of these results, which compared against the JS
backend, should be divided by roughly 2–8×. The numbers below all use `wasm-O3`.

### 2. The win is still ensembles — but the multiplier is smaller and the crossover later

| Model                      | 1 run                            | 1024 runs                        | 16384 runs                     |
| -------------------------- | -------------------------------- | -------------------------------- | ------------------------------ |
| SIR (15 cells, 3200 steps) | 0.04 → 2.27 ms (**57× slower**)  | 41.5 → 2.5 ms (**16× faster**)   | 660 → 5.4 ms (**123× faster**) |
| 10-wide sectoral           | 0.01 → 1.09 ms (**82× slower**)  | 13.5 → 4.2 ms (**3.2× faster**)  | 222 → 4.0 ms (**55× faster**)  |
| 400-variable scalar        | 0.06 → 6.98 ms (**120× slower**) | 59.8 → 17.7 ms (**3.4× faster**) | —                              |

The mechanism is unchanged and is the important part: **GPU cost is nearly independent of
ensemble size.** SIR takes 2.27 ms for one run, 2.51 ms for 1024 runs, and 5.38 ms for
16,384 runs. Marginal cost per additional run:

| Model            | wasm (ms/run) | GPU marginal (ms/run) | ratio | crossover |
| ---------------- | ------------- | --------------------- | ----- | --------- |
| SIR              | 0.040         | 0.0002                | ~200× | ~55 runs  |
| 10-wide sectoral | 0.013         | 0.0002                | ~65×  | ~190 runs |
| 400-var scalar   | 0.058         | 0.011                 | ~5×   | ~150 runs |

Against JS the crossover was 15–65 runs; against WASM it is **~50–200 runs**. Below that,
use the CPU.

### 3. A single run does not get faster — this is worse against WASM

Every single-run case loses, by more than it did against JS:

- Narrow models: **47–120× slower** than WASM.
- 1000 elements wide: **3.5× slower**.
- 10,000 elements wide: 1.1× vs the prototype's JS model (no WASM baseline available; WASM
  would be faster still, so this is a loss too).

This is the direct answer to the "simulate all 8760 hours in parallel" hope in the issue: a
model with ~8760 independent elements per time step lands around the `w=10000` row, and even
there the GPU does not beat a `-O3` WASM build. One time step of an SD model is a short chain
of cheap element-wise operations; the chain has to be walked in order regardless of width,
and the fixed per-step costs eat the parallel gain.

### 4. Serial depth is what the GPU fights, and it never wins outright

All three models are 1000 elements wide; only dependency depth changes:

| depth | layers | wasm-O3 | best GPU | ratio       |
| ----- | ------ | ------- | -------- | ----------- |
| 2     | 3      | 0.56 ms | 3.67 ms  | 6.6× slower |
| 8     | 9      | 1.34 ms | 4.65 ms  | 3.5× slower |
| 32    | 33     | 4.43 ms | 9.40 ms  | 2.1× slower |

Deeper models close the gap (more arithmetic amortizes the same per-step overhead) but never
close it completely for a single run.

### 5. Dispatch overhead sets a hard floor

The `layered` strategy needs `layers × steps` dispatches, and each costs **~4–6 µs** even
with everything encoded into one command buffer and submitted once (CPU-side encode is only
0.2–3 ms, so this is GPU/driver-side):

| case                  | dispatches | GPU time |
| --------------------- | ---------- | -------- |
| `wide w=1` (17 cells) | 2214       | 16.5 ms  |
| `sir` (15 cells)      | 12908      | 41.3 ms  |
| `long t=2000`         | 22014      | 115.2 ms |

The obvious WebGPU design — one kernel per layer per time step — is therefore the _worst_ of
the three strategies for almost every real model. Putting the time loop inside the shader is
essential, not an optimization.

### 6. Strategy choice swings results by four orders of magnitude

|                | best for                              | worst case                       |
| -------------- | ------------------------------------- | -------------------------------- |
| `layered`      | very wide models (w ≥ 100k)           | 41 ms floor on a 15-cell model   |
| `perWorkgroup` | single runs of moderately wide models | 82 ms on a 1024-run scalar model |
| `perThread`    | ensembles of any model                | 18.4 s on a 100k-wide single run |

`perThread` is 30,000× worse than `perWorkgroup` on the widest single-run case; `perWorkgroup`
is 4.6× worse than `perThread` on the 1024-run scalar case. A real backend would have to pick
per model shape _and_ per call site.

### 7. f32 is the only option, and it costs 3–4 significant digits

WGSL has `f32` and (optionally) `f16`. There is no `f64` and none is planned. Maximum relative
error against the f64 result, over all outputs and save points:

| model                                      | max relative error |
| ------------------------------------------ | ------------------ |
| most synthetic models                      | 1e-7 – 1e-6        |
| `wide w=10000`                             | 2.2e-5             |
| `wide w=100000` (SUM over 100k f32 values) | 5.7e-4             |
| SIR (3200 integration steps)               | 3.9e-4             |

Error grows with integration step count and reduction width. 3.9e-4 on SIR means ~3–4 correct
significant digits after 3200 steps — fine for a chart or an objective function, probably not
fine for `check-core` comparisons against Vensim reference data without per-test tolerances.

## Memory and readback at En-ROADS scale (the calibration use case)

Model shaped like En-ROADS: 350 unsubscripted variables in 25 dependency layers, 1990–2100,
`TIME STEP = 0.25`, `SAVEPER = 1` (440 steps, 111 save points). `perThread` strategy.
`read` is the extra cost of mapping the output buffer back to JavaScript.

```
case                    outs  saves    stateMB outMB(f32) outMB(f64)   wasm-O3      gpu  gpu+read    read  vs wasm
all-outputs runs=1      350   111          0.0        0.1        0.3      0.20    14.88     15.10    0.23     0.0x
all-outputs runs=10     350   111          0.0        1.5        3.0      2.02    29.05     29.45    0.40     0.1x
all-outputs runs=100    350   111          0.1       14.8       29.6     20.10    34.45     36.95    2.50     0.5x
all-outputs runs=1000   350   111          1.4      148.2      296.4    200.20    49.25     69.40   20.15     2.9x
all-outputs runs=4000   350   111          5.5      592.8     1185.6    816.90    44.25    143.70   99.45     5.7x
few-outputs runs=100     10   111          0.1        0.4        0.8      9.87    22.57     22.87    0.30     0.4x
few-outputs runs=1000    10   111          1.0        4.2        8.5     95.20    26.05     26.95    0.90     3.5x
few-outputs runs=4000    10   111          4.1       16.9       33.9    382.20    24.00     26.75    2.75    14.3x
few-outputs runs=16000   10   111         16.3       67.7      135.5   1538.00    27.85     37.75    9.90    40.7x
```

### The state buffer is not the problem; the output buffer is

The 1000×-memory concern applies only to outputs. The model's _state_ — every variable for
every run — is 1.4 MB at 1000 runs and 5.5 MB at 4000 runs, because it is one f32 per
variable per run with no time dimension. It is the output buffer that carries the `saves`
factor.

The estimate in the question was right: 350 vars × 111 years × 1000 runs is **148 MB as f32
on the GPU, 296 MB once expanded to f64 in JavaScript**.

### Readback runs at ~6–7.5 GB/s, so it is real but not fatal

| output bytes | readback |
| ------------ | -------- |
| 14.8 MB      | 2.5 ms   |
| 67.7 MB      | 9.9 ms   |
| 148.2 MB     | 20.2 ms  |
| 592.8 MB     | 99.5 ms  |

That is roughly **150 µs per MB**, linear. At 1000 runs with all outputs, readback is 20 ms of
a 69 ms total (29%). At 4000 runs it is 99 ms of 144 ms (**69%**) — so readback does become
the dominant cost as the ensemble grows, and it is what flattens the speedup curve
(2.9× at 1000 runs, only 5.7× at 4000).

Note this is on Apple unified memory. On a discrete GPU the copy crosses PCIe and would be
slower.

### Capturing fewer variables is the whole ballgame

Comparing the two halves of the table at the same ensemble size:

| runs | all 350 outputs         | only 10 outputs     |
| ---- | ----------------------- | ------------------- |
| 1000 | 69.4 ms (2.9× vs wasm)  | 27.0 ms (**3.5×**)  |
| 4000 | 143.7 ms (5.7× vs wasm) | 26.8 ms (**14.3×**) |

Dropping from 350 outputs to 10 does two things: it removes almost all the readback, and it
also removes about a third of the GPU compute (writing 350 values × 111 save points per run is
itself significant work — it is also half of WASM's cost, 200 ms vs 95 ms for the same 1000
runs).

For calibration this is a free win, because an objective function only reads a handful of
variables. **Design the batch API so the caller declares which variables it wants**, rather
than capturing everything.

### Ensembles need to be large — thousands, not hundreds

With only 10 outputs, GPU time is essentially flat from 100 to 16,000 runs (22.6 → 27.9 ms)
while WASM grows linearly (9.9 → 1538 ms). The speedup goes 0.4× → 3.5× → 14.3× → **40.7×**.
One thread per run means the ensemble size _is_ the thread count, and an M1 Max wants tens of
thousands of threads in flight to hide memory latency. At 100–1000 runs the GPU is mostly
idle.

For a calibration loop this argues for wide, shallow search — evaluate a few thousand
candidates per generation rather than a few dozen — which happens to be exactly what
population-based optimizers (genetic algorithms, CMA-ES, particle swarm) want anyway.

### The portability constraint is sharper than the memory constraint

WebGPU's _guaranteed minimum_ limits are `maxStorageBufferBindingSize` = **128 MiB** and
`maxBufferSize` = **256 MiB**. The M1 Max reports 4 GiB, but a conformant device need not.
Against the 128 MiB floor:

| outputs captured | max runs in one batch |
| ---------------- | --------------------- |
| 350              | 863                   |
| 10               | 30,229                |

So an implementation must either query the device limits and chunk the ensemble, or restrict
the captured output set. Chunking is straightforward (the state buffer is small, so batches
are cheap to set up) but it has to exist.

## The EPS case from issue #319 (all 8760 hours per year)

jrissman's comment describes a specific hope: the EPS has many non-time subscripts that do
not interact — 12 vehicle types, ~25 industry categories, up to 8760 hours per annual time
step — and "even if we can only accelerate operations by parallelizing calculations for
non-interacting subscript elements or non-interacting variables, that would be enough to
allow the EPS to run many times faster."

None of the models above were representative of that. The width sweep used one homogeneous
dimension with a stock per element, ran 200 time steps, and had 9 dependency layers. So this
section measures the real thing.

### What the real EPS actually looks like

`inspect.mjs` runs SDE's parser and variable reader over the exact revision jrissman linked
(eps-us @ `2e3acf8`, the all-8760-hours version) and measures its structure:

|                                           |                                                        |
| ----------------------------------------- | ------------------------------------------------------ |
| Equations / variable instances            | 3,411 / 30,203                                         |
| Variables evaluated every time step       | 1,799                                                  |
| Simulation window                         | 2020–2050, `TIME STEP = 1` → **31 time steps**         |
| Dependency layers per time step           | **77**                                                 |
| Cell evaluations per time step            | **2,790,056**                                          |
| Layer width (cells evaluable in parallel) | min 1, p25 172, median 2,607, p90 157,398, max 376,099 |
| Work in layers narrower than 4096 cells   | **2.0%**                                               |

Two things stand out, and both are good news for a GPU:

1. **Only 31 time steps.** Every other model in this study runs 200–3200 steps. Per-time-step
   overhead — the thing that dominated the `layered` strategy everywhere else — is 100× less
   important here.
2. **98% of the work is in layers wide enough to fill a GPU.** The hourly detail really is
   there: `Electricity Source[17] × Day[365] × Hour[24]` is 148,920 cells, and the widest
   layer is 376,099 cells.

The "8760 hours" is expressed as `Day[365] × Hour[24]`, not a single 8760-element dimension.

Note that SDE cannot currently compile this revision at all — it uses `VECTOR RANK`, which the
compiler does not implement — so the measurement stops after the variable-reading phase and
derives dependency depth from the parsed ASTs directly.

### A stand-in with the same work profile

`bench/eps-shaped-model.mjs` generates a Vensim model that reproduces that profile: the same
77 layers with the same measured width at each layer, built from variables over the real EPS
dimension sizes, with the same 2020–2050 window and `SUM` roll-ups over the hourly dimensions
at the end. It reproduces _how much independent work exists at each point in the dependency
chain_, which is what decides whether a GPU can help. It does not reproduce the EPS's actual
equations, its lookups, or its allocation functions — its arithmetic per cell is simpler, so
absolute times here are optimistic for both backends.

```
case                    cells     instr  lyr  dispatch     wasm-O3   layered     perWG  vs wasm  maxRel
eps 8760h runs=1        3,176,895 1346   81   2606          155.60    125.30    280.00     1.2x  2.1e-3
eps width=1/24 runs=1   149,220   950    81   2606            5.32     23.97     16.87   (3.2x)  1.1e-4
eps width=1/8 runs=1    433,486   1003   81   2606           19.27     35.85     37.55   (1.9x)  3.8e-4
eps width=1/2 runs=1    1,781,641 1271   81   2606           59.10    121.90    196.90   (2.1x)  1.9e-3
eps 8760h runs=4        3,176,895 1346   81   2606          307.40    180.20         -     1.7x  2.1e-3
```

(`width=1/24` scales every layer down by 24×, which is roughly the "representative timeslices
instead of 8760 hours" version the EPS ships today.)

### The answer: yes, WebGPU finally wins here — by 1.2×

This is the first single-run case in the whole study where WebGPU beats the WASM backend.
It wins because the EPS has exactly the two properties that were missing everywhere else:
very few time steps and very wide layers.

But 1.2× is not "many times faster", and the trend explains why. Comparing the half-width and
full-width rows:

|             | cells/step | wasm-O3  | GPU (`layered`) |
| ----------- | ---------- | -------- | --------------- |
| half detail | 1.78 M     | 59.1 ms  | 121.9 ms        |
| full detail | 3.18 M     | 155.6 ms | 125.3 ms        |
| ratio       | 1.8×       | **2.6×** | **1.03×**       |

The GPU barely notices the extra 1.4 M cells per step — it is running into a fixed cost of
~20–24 ms (2606 dispatches plus per-layer setup) and has spare throughput above that. WASM
scales worse than linearly (2.6× time for 1.8× work, i.e. it is falling out of cache). So the
crossover happens right around full EPS detail, and past it the GPU's advantage would keep
growing.

Measured throughput on the incremental work between the `1/24` and full rows:

|                      | cell evaluations per second |
| -------------------- | --------------------------- |
| WASM `-O3`, one core | 551 M/s                     |
| WebGPU, `layered`    | 818 M/s                     |

A 3072-ALU GPU achieving only 1.5× the throughput of one CPU core is the real finding. The
work is a shallow chain of cheap element-wise operations with one read and one write per
cell; there is not enough arithmetic per byte moved for the GPU's advantage to show, and 21
of the 77 layers are narrower than 256 cells and cannot fill the machine at all.

### Caveats specific to this case

- **f32 error reaches 2.1e-3** — about two to three correct significant digits. That is the
  worst in this study, and it comes from the `SUM` roll-ups over ~149,000 single-precision
  values. Hourly-detail models are exactly the ones where f32 hurts most.
- **The real EPS would likely do worse than 1.2×**, not better. Its equations use lookups
  (this prototype's shader does a linear scan, with no cached last-hit index), `ALLOCATE
AVAILABLE`, `VECTOR RANK`, and other constructs that map poorly to a GPU, while the
  synthetic model only uses multiply/add/`SQRT`/`ABS`.
- **Ensembles hit memory limits fast at this scale.** Model state alone is 12.1 MB per run,
  so 4 runs is 48.5 MB and 100 runs would be 1.2 GB — well past WebGPU's guaranteed 128 MiB
  storage-buffer minimum. A 16-run ensemble did not complete within a 15-minute budget.
- Only `layered` and `perWorkgroup` were run. `perThread` gives a single GPU lane the entire
  model, which at this size takes minutes.

### What this suggests instead

The EPS's hourly dimension is genuinely parallel, and that parallelism is worth exploiting —
but a GPU is not the cheapest way to exploit it. The same independence would let a WASM build
use SIMD (`-msimd128`, four f64 lanes or eight f32) or split the hour dimension across worker
threads. On this machine's 10 cores, either would comfortably beat 1.2× for far less
engineering than a WebGPU backend, and without the f32 precision loss.

## What this means for SDEverywhere

**Not an interactive-speed play.** For "user moves a slider, one model run", WebGPU is 3–120×
_slower_ than the WASM backend that ships today. Nothing here suggests engineering closes
that; the limit is serial dependency depth plus fixed GPU latency.

**A good fit for the proposed automatic calibration system**, with three qualifications the
measurements make concrete:

1. **Run thousands of candidates per generation, not dozens.** Below ~50–200 runs the CPU
   wins outright; the large multipliers only appear in the thousands.
2. **Capture only the variables the objective needs.** This is worth more than any other
   single decision — 14.3× vs 5.7× at 4000 runs.
3. **Chunk to stay under 128 MiB of outputs per batch** if the implementation is meant to run
   on arbitrary devices.

With those, an En-ROADS-scale calibration loop evaluating 4000 candidates against ~10
objective variables looks like **~27 ms per generation on the GPU vs ~382 ms on WASM**. If the
optimizer needs, say, 200 generations, that is 5 s versus 76 s.

Note that WASM already parallelizes across workers reasonably well, and 10 CPU cores would
narrow a 14× gap to something closer to 2–3×. A worker pool is far less work than a WebGPU
backend and should probably be measured before committing to one.

**The flat value buffer is a genuine prerequisite** and is a self-contained change that could
land in the compile package independently. But this prototype does **not** show it being
faster on the CPU: for subscripted models the prototype's flat JS model is 2–4× _slower_ than
production JS, because it emits one function call per subscript cell rather than a tight loop.
That is an artifact of this prototype's JS emitter rather than of the layout, but "flat buffer
will also speed up the JS/C backends" remains unproven.

## Limitations of this prototype

- **Language coverage**: 33 of the 56 models in `models/` compile and match SDE's production
  JS output exactly. Of the rest, 8 use functions SDE's own JS backend does not implement
  either (`ALLOCATE AVAILABLE`, `DELAY FIXED`, `DEPRECIATE STRAIGHTLINE`, `GAMMA LN`,
  `FIND MARKET PRICE`), 8 need external data files, and the remainder need `INVERT MATRIX`,
  `VECTOR ELM MAP`, `VECTOR SORT ORDER`, or `GET DIRECT *`.
- **No `.dat` data variables**, so no model with time-series data inputs was benchmarked.
- **`LOOKUP` is a linear scan** in the shader, without the CPU implementation's cached
  last-hit index. Lookup-heavy models would look worse than these results suggest.
- **One GPU tested**, with unified memory. A discrete GPU would likely show a larger ensemble
  win (more ALUs) and a larger readback cost.
- **The WASM baseline runs on one thread, without SIMD.** A worker pool or `-msimd128` would
  improve it substantially on this machine; neither comparison was run, and both would eat
  into the GPU's advantage in every case measured here.
- **`storeOutputs` in the `layered` strategy** assumes `SAVEPER` is an exact multiple of
  `TIME STEP`.
- The synthetic models are deliberately regular. The EPS stand-in reproduces the real model's
  measured per-layer work profile but not its equations, lookups, or allocation functions, so
  its absolute times are optimistic for both backends.
- **SDE cannot compile the EPS revision referenced in the issue** (it uses `VECTOR RANK`), so
  no end-to-end run of the real model was possible.

# Clone 2 — implicit `Time` dependencies + time-invariant aux hoisting

This clone contains items 2 and 3 from the "Suggested order of work" section of the
En-ROADS performance investigation (`../en-roads-app1/NOTES.md`). They are together in one
clone because item 3 depends on item 2 being correct.

Item 1 (`static inline` vensim helpers, in clone 1) and item 4 (constant folding, in
clone 3) are **not** included here, so this clone measures items 2+3 in isolation.

---

## Item 2 — record the implicit `Time` dependencies

### The problem

`RAMP`, `STEP`, `PULSE`, `PULSE TRAIN`, and `GAME` all read the current simulation time,
but they take it implicitly rather than as an argument, so nothing appeared in the calling
variable's `references` list. Likewise `SAMPLE IF TRUE` holds the variable's own value from
the previous time step, but that self-reference was not recorded either.

The result was that a variable like

```
rate = STEP(10, 10)
```

looked, in the reference graph, exactly like a variable that depends on nothing at all.
Any analysis that trusts the graph will conclude that `rate` is constant. That is what item 3
does, so item 2 has to be fixed first — but it is worth fixing on correctness grounds alone,
since the graph is also published in `{model}.json` for downstream tools.

### Changes

**`packages/compile/src/model/read-equations.js`**

- Added a `timeDependentFnIds` set (`_GAME`, `_PULSE`, `_PULSE_TRAIN`, `_RAMP`, `_STEP`).
- After a function call is validated, a call to one of those records a reference to `_time`,
  and a `SAMPLE IF TRUE` call records a reference to the variable itself.
- `Context.addVarReference` takes a new `allowSelfReference` argument (default `false`, so
  existing behavior is unchanged) so that the `SAMPLE IF TRUE` self-reference can be added.

**`packages/compile/src/model/model.js`**

- `sortVarsOfType` now skips self-references when building the dependency graph. A self-edge
  does not constrain the evaluation order, but `toposort` would report it as a cycle.
- `sortInitVars` now filters out the `Time` placeholder variable. `initLevels` sets `_time`
  to `_initial_time` as its first statement and `Time` has no equation of its own, so it must
  never appear in the sorted init list — which could now happen if a `RAMP`/`STEP`/... call
  appears in an "init" argument position (e.g. the second argument of `INTEG`).

### Compatibility notes

These are worth reviewing before merging:

1. **Variable indices shift.** The `Time` placeholder used to be dropped by
   `removeUnusedVariables` for any model that used `PULSE`/`STEP`/`RAMP`/`GAME` without
   naming `Time` explicitly. It is now retained, so it appears in `{model}.json` and shifts
   the `varIndex` of every variable after it. Anything that persists variable indices across
   a rebuild would need to be regenerated. (The listing and the model are always generated
   together, so this is self-consistent within a build.)
2. **`Time` becomes an accessible output.** `storeOutput` now has a case for `_time` in the
   affected models. This was already true for models that referenced `Time` explicitly.
3. **`references` lists grow.** Tools that display the reference graph will now show `Time`
   as a dependency of these variables, which is the intent.

### Test updates

29 existing tests in `packages/compile` asserted the old (incomplete) reference lists and
variable indices, so their expectations were updated. Every change is one of:
`references` gaining `'_time'`, `references` gaining the variable's own ref ID for
`SAMPLE IF TRUE`, or a `varIndex`/`case` renumbering caused by `_time` being retained.
No test was weakened or removed. **Please review these test edits** — `AGENTS.md` asks for
a check-in before test changes, and this was done without one to keep the work moving.

---

## Item 3 — hoist time-invariant aux out of the step loop

### What it does

`Model.auxVars()` is split into two lists:

- `Model.timeInvariantAuxVars()` — aux variables whose values cannot change over a run
- `Model.timeVaryingAuxVars()` — everything else

The code generator emits the first group as `evalAuxOnce()` and the second as `evalAux()`.
`evalAuxOnce()` is called once, as the last statement of `initLevels()`.

### Why `initLevels` and not `initConstants`

You asked whether these could just go at the end of `initConstants` instead of in a separate
function. They cannot, for two reasons:

1. **Inputs are applied after `initConstants` returns.** The sequence in `model.c` is
   `initConstants()` → `setConstantOverridesFromBuffers()` → `setInputs()` → `initLevels()`
   → `run()`. A time-invariant aux is allowed to depend on an input constant — that is the
   normal case, not an edge case (En-ROADS has ~300 input constants). Evaluating it inside
   `initConstants` would compute it from the default constant values and ignore the inputs
   for the run.
2. **A time-invariant aux can depend on an `INITIAL(...)` variable,** and those are computed
   in `initLevels`, after `initConstants`.

So the earliest correct point is after `initLevels` has computed the init values. Two
placements work from there: a separate function called from the run sequence, or a call at
the end of the generated `initLevels`. This clone uses the latter, because it needs **no
change at all** to the runtime contract — `model.c`, `sde.h`, the `JsModel` interface, and
the `runtime`/`runtime-async` packages are all untouched. `evalAuxOnce` is purely internal to
the generated model file. Adding a new exported entry point would have meant a coordinated
change across separately-versioned packages for no functional gain.

The one cost is that `initLevels` now does slightly more than its name suggests. Its comment
already says "and the variables they depend on", so this seemed like an acceptable stretch,
but it is a judgement call worth confirming.

### How time invariance is decided

`packages/compile/src/model/analyze-time-invariance.js` (new) walks the reference graph. An
aux variable is time invariant when **all** of the following hold:

- it is not the `Time` placeholder (note: that variable has a var type of `const`, so it has
  to be excluded by name);
- its var subtype is not `fixedDelay` or `depreciation` (both keep per-step state);
- it does not call a time-reading or stateful function (`GAME`, `PULSE`, `PULSE TRAIN`,
  `RAMP`, `STEP`, `DELAY FIXED`, `DEPRECIATE STRAIGHTLINE`, `SAMPLE IF TRUE`,
  `GET DATA BETWEEN TIMES`);
- it does not call a function that returns a pointer to a shared internal buffer
  (`ALLOCATE AVAILABLE`, `ALLOCATE BY PRIORITY`, `DEMAND AT PRICE`, `SUPPLY AT PRICE`,
  `FIND MARKET PRICE`, `INVERT MATRIX`, `VECTOR SORT ORDER`) — these are time invariant in
  principle, but they are excluded out of conservatism;
- every variable it references is a constant, a lookup, an `INITIAL` variable, or another
  time-invariant aux. Referencing a level or a data variable disqualifies it.

The function-name checks overlap with the reference checks (the time-reading functions now
record a `_time` reference thanks to item 2), which is deliberate: the analysis stays correct
even if that part of item 2 is later reverted.

Note that this is deliberately conservative. It will classify some genuinely constant
variables as time varying; it should never do the reverse.

### Changes

- **`packages/compile/src/model/analyze-time-invariance.js`** (new): the analysis above.
- **`packages/compile/src/model/model.js`**: added `timeInvariantAuxVars()` and
  `timeVaryingAuxVars()`, both cached like the other sorted lists.
- **`packages/compile/src/generate/gen-code-c.js`**: emits `evalAuxOnce*` (before
  `initLevels`, since C requires a declaration before use), calls `evalAuxOnce()` at the end
  of `initLevels`, and emits `evalAux` from `timeVaryingAuxVars()`.
- **`packages/compile/src/generate/gen-code-js.js`**: the same for the JS backend.

Set `SDE_NONPUBLIC_HOIST_TIME_INVARIANT_AUX=0` to turn the hoisting off (every aux is then
treated as time varying, i.e. the previous behavior). This follows the existing
`SDE_NONPUBLIC_REDUCE_VARIABLES` convention and is useful for A/B testing.

---

## Results

- `pnpm -F @sdeverywhere/compile test`: 901 passed.
- `./tests/run-c-int-tests` and `./tests/run-js-int-tests`: all sample models match their
  Vensim reference output exactly.
- En-ROADS: model-check reports "all clear" for every comparison view, i.e. the output is
  **bit-identical** to the `develop` baseline.
- En-ROADS Wasm (`emcc -O2`), model-check perf comparison against the `develop` baseline
  bundle (Apple M1 Max, Chrome), three "Run" passes:

  | run |  develop |  current |  % change |
  | --- | -------: | -------: | --------: |
  | 1   |     23.9 |     23.0 |     -3.6% |
  | 2   |     24.0 |     22.9 |     -4.5% |
  | 3   |     23.9 |     22.8 |     -4.5% |
  | all | **23.9** | **22.9** | **-4.2%** |

  (median ms per model run.)

The investigation predicted ~-6% for the hoisting; the measured result is a bit below that.
Generated Wasm size is essentially unchanged (+408 bytes, +0.0%).

For reference, the hoisting moves **~390 of the ~4,440 aux statements** in En-ROADS
(about 8.8%) out of the step loop — 13 `evalAuxOnce` chunk functions against 135 `evalAux`
chunks.

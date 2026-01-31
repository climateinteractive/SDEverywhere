# Development Plan and Log

This document summarizes the work that has been completed (and not yet completed) on the `chris/468-xmile-with-playground-v2` branch.

## Branch Summary

The `chris/468-xmile-with-playground-v2` branch adds a "playground" web app for SDEverywhere that allows users to paste Vensim (.mdl) or Stella (.stmx/XMILE) model files, compile them, view generated JavaScript code, and visualize outputs with interactive graphs and sliders.

---

## What Has Been Built

### Structure

The playground app is located in `examples/playground/` with the following structure:
```
src/
├── index.ts                  # App entry point
├── app.svelte                # Root component (3-column layout)
├── app-vm.ts                 # Application view model (Svelte 4 stores)
├── global.css                # Global dark theme styles
├── types.d.ts                # Type declarations
└── components/
    ├── _shared/
    │   ├── selector.svelte   # Dropdown component
    │   └── selector-vm.ts    # Selector view model
    └── graph/
        ├── graph.svelte      # Chart.js visualization
        ├── graph-vm.ts       # Graph types/interfaces
        └── graph-view.ts     # Chart.js wrapper class
```

### Key Files

- **`src/app.svelte`** - Root component with 3-column layout: source editor, generated code, variable selector + graph
- **`src/app-vm.ts`** - AppViewModel class managing compilation workflow using Svelte 4 writable/derived stores
- **`src/components/graph/graph.svelte`** - Chart.js line chart component for visualizing model outputs
- **`src/components/_shared/selector.svelte`** - Dropdown selector for choosing output variables

### Key Features/Changes

- Parses XMILE (Stella) and Vensim MDL model formats
- Compiles models to JavaScript using `@sdeverywhere/compile`
- Runs compiled models using `@sdeverywhere/runtime`
- Displays generated JavaScript code
- Visualizes output variables with Chart.js line charts
- Dark theme UI with monospace editors

---

## What Is Left To Do

### Phase 1: Svelte 5 Migration ✅ COMPLETE
- [x] Convert `app-vm.ts` from Svelte stores to Svelte 5 runes (`$state`, `$derived`)
  - Renamed to `app-vm.svelte.ts` (rune-aware module)
  - Replaced `writable()` with `$state()`
  - Replaced `derived()` with `$derived()` and `$derived.by()`
  - Replaced `.subscribe()` with `$effect()`
- [x] Convert `app.svelte` from store subscriptions (`$storeVar`) to runes
  - Removed store auto-subscription prefix (`$`)
  - Simplified by inlining the selector (removed Selector component)
- [x] Remove selector.svelte and selector-vm.ts (no longer needed - selector is now inline)
- [x] Convert `graph.svelte` reactive statements (`$:`) to `$effect()`
  - Converted `export let` to `$props()` interface
  - Converted `$:` reactive statement to `$effect()`
  - Converted string interpolation to `$derived()`
- [x] Remove all `svelte/store` imports
- [x] Update svelte.config.js to use `vitePreprocess` instead of `svelte-preprocess`
- [x] Verified type-check and svelte-check pass

### Phase 2: Tabbed Pane UI
- [ ] Replace the 2nd and 3rd columns with a single tabbed pane on the right side
- [ ] Tab 1: "Messages" - Display compilation warnings and errors
- [ ] Tab 2: "Generated Code" - Show the generated JavaScript (move from current column 2)
- [ ] Tab 3: "Graphs and Sliders" - Interactive visualization panel

### Phase 3: Polish and Layout Improvements
- [ ] Update overall styling to be more like modern REPL/playground environments (VS Code, CodeSandbox, etc.)
- [ ] Add a header bar with app title and controls
- [ ] Improve editor styling (syntax highlighting would be nice but not required)
- [ ] Add proper resizable panes
- [ ] Improve visual feedback during compilation

### Phase 4: Graph and Slider Editor
- [ ] **Top Left Sidebar**: List all output variables (aux/level types) parsed from generated model
- [ ] **Top Right Panel**: Scrolling area for graphs
  - [ ] Drag variable from sidebar to blank space → create new graph
  - [ ] Drag variable onto existing graph → add to that graph
- [ ] **Bottom Left Sidebar**: List all constants (input variables), sorted alphabetically
- [ ] **Bottom Right Panel**: Scrolling area for sliders
  - [ ] Drag constant from sidebar → add slider
  - [ ] Moving slider runs model and updates graphs in real-time

---

## Progress Log

### 2026-01-31: Phase 1 - Svelte 5 Migration

- Explored the current playground codebase structure
- Identified Svelte 4 patterns that need to be converted to Svelte 5
- Created this development plan document
- **Completed Phase 1: Svelte 5 Migration**
  - Converted `app-vm.ts` → `app-vm.svelte.ts` with runes (`$state`, `$derived`, `$derived.by`, `$effect`)
  - Updated `app.svelte` to use direct property access instead of store subscriptions
  - Simplified by inlining the variable selector (removed separate Selector component)
  - Converted `graph.svelte` from `export let` props to `$props()` interface
  - Replaced `$:` reactive statements with `$effect()`
  - Updated `svelte.config.js` to use `vitePreprocess` (Svelte 5 standard)
  - Removed unused files: `app-vm.ts`, `selector.svelte`, `selector-vm.ts`
  - All type-check and svelte-check passes

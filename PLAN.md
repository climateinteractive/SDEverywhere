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

### Phase 2: Tabbed Pane UI ✅ COMPLETE
- [x] Replace the 2nd and 3rd columns with a single tabbed pane on the right side
- [x] Tab 1: "Messages" - Display compilation warnings and errors
- [x] Tab 2: "Generated Code" - Show the generated JavaScript
- [x] Tab 3: "Graphs and Sliders" - Interactive visualization panel

### Phase 3: Polish and Layout Improvements ✅ COMPLETE
- [x] Update overall styling to be more like modern REPL/playground environments
- [x] Add a header bar with app title and compilation status
- [x] Improve visual feedback during compilation

### Phase 4: Graph and Slider Editor ✅ COMPLETE
- [x] Break monolithic app.svelte into separate components:
  - `graphs-editor/graphs-editor.svelte` - main container
  - `graphs-editor/graphs-editor-vm.svelte.ts` - view model
  - `graphs-editor/graph-card.svelte` - individual graph card
  - `graphs-editor/slider-card.svelte` - individual slider card
  - `graphs-editor/var-sidebar.svelte` - variable list sidebar
- [x] **Top Left Sidebar**: List all output variables (aux/level types)
- [x] **Top Right Panel**: Scrolling area for graphs
  - [x] Drag variable from sidebar to blank space → create new graph
  - [x] Drag variable onto existing graph → add to that graph
- [x] **Graph Card Features**:
  - [x] Drag handle to reorder graphs
  - [x] Editable title field
  - [x] Remove button
  - [x] Variables table with: label, variable name, color picker, style dropdown
  - [x] Drag handles and remove buttons for variables
- [x] **Bottom Left Sidebar**: List all constants (input variables), sorted alphabetically
- [x] **Bottom Right Panel**: Scrolling area for sliders
  - [x] Drag constant from sidebar → add slider

---

## Progress Log

### 2026-01-31: Phase 1-4 Complete

- Explored the current playground codebase structure
- Identified Svelte 4 patterns that need to be converted to Svelte 5
- Created this development plan document

**Phase 1: Svelte 5 Migration**
- Converted `app-vm.ts` → `app-vm.svelte.ts` with runes
- Updated components to use `$props()`, `$state`, `$derived`, `$effect`
- Updated `svelte.config.js` to use `vitePreprocess`

**Phase 2: Tabbed Pane UI**
- Created `Tabs` component for tabbed interface
- Added Messages, Generated Code, and Graphs & Sliders tabs
- Updated styling for dark theme

**Phase 3: Polish and Layout**
- Added header bar with logo and compilation status
- Improved overall visual styling

**Phase 4: Graph and Slider Editor**
- Created modular component structure:
  - `graphs-editor/` - main editor component and view model
  - `graph-card.svelte` - graph card with title, chart, and variable table
  - `slider-card.svelte` - slider control card
  - `var-sidebar.svelte` - draggable variable list sidebar
- Implemented drag-and-drop for creating graphs and sliders
- Added editable graph titles
- Added variable table with label, color picker, and style dropdown
- Implemented reordering for variables within graphs

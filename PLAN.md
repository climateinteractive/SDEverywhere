# Development Plan and Log

This document summarizes the work that has been completed (and not yet completed) on the `chris/468-xmile-with-playground-v2` branch.

## Branch Summary

The `chris/468-xmile-with-playground-v2` branch adds a "playground" web app for SDEverywhere that allows users to paste Vensim (.mdl) or Stella (.stmx/XMILE) model files, compile them, view generated JavaScript code, and visualize outputs with interactive graphs and sliders.

---

## What Has Been Built

### Structure

The playground app is located in `examples/playground/` with the following structure:
```
.storybook/
├── main.ts                   # Storybook configuration
├── preview.ts                # Preview configuration (dark theme)
├── vitest.setup.ts           # Vitest setup for Storybook tests
└── storybook.css             # Storybook-specific CSS fixes
src/
├── index.ts                  # App entry point
├── app.svelte                # Root component (2-column layout with tabs)
├── app-vm.svelte.ts          # Application view model (Svelte 5 runes)
├── global.css                # Global dark theme styles
├── types.d.ts                # Type declarations
└── components/
    ├── _storybook/
    │   └── story-decorator.svelte  # Story wrapper component
    ├── tabs/
    │   ├── tabs.svelte             # Tabbed pane component
    │   └── tabs.stories.svelte     # Tabs stories
    ├── graph/
    │   ├── graph.svelte            # Chart.js visualization
    │   ├── graph-vm.ts             # Graph types/interfaces
    │   └── graph-view.ts           # Chart.js wrapper class
    └── graphs-editor/
        ├── graphs-editor.svelte         # Main editor container
        ├── graphs-editor.stories.svelte  # Editor stories
        ├── graphs-editor-vm.svelte.ts   # Editor view model
        ├── graph-card.svelte            # Individual graph card
        ├── graph-card.stories.svelte    # Graph card stories
        ├── slider-card.svelte           # Individual slider card
        ├── slider-card.stories.svelte   # Slider card stories
        ├── var-sidebar.svelte           # Variable list sidebar
        └── var-sidebar.stories.svelte   # Var sidebar stories
```

### Key Files

- **`src/app.svelte`** - Root component with 2-column layout: source editor on left, tabbed pane on right
- **`src/app-vm.svelte.ts`** - AppViewModel class managing compilation workflow using Svelte 5 runes
- **`src/components/tabs/tabs.svelte`** - Tabbed pane component for Messages, Generated Code, and Graphs & Sliders
- **`src/components/graph/graph.svelte`** - Chart.js line chart component for visualizing model outputs
- **`src/components/graphs-editor/graphs-editor.svelte`** - Main editor with drag-and-drop for graphs and sliders
- **`src/components/graphs-editor/graph-card.svelte`** - Graph card with title, chart, legend, and variable table
- **`src/components/graphs-editor/slider-card.svelte`** - Slider control card for input variables
- **`src/components/graphs-editor/var-sidebar.svelte`** - Draggable variable list sidebar

### Key Features/Changes

- Parses XMILE (Stella) and Vensim MDL model formats
- Compiles models to JavaScript using `@sdeverywhere/compile`
- Runs compiled models using `@sdeverywhere/runtime`
- Displays generated JavaScript code
- Visualizes output variables with Chart.js line charts
- Dark theme UI with monospace editors
- Drag-and-drop interface for creating graphs and sliders
- Storybook for component development and testing (`pnpm -F playground storybook`)

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

### Phase 5: Storybook Setup ✅ COMPLETE
- [x] Set up Storybook configuration (following `packages/check-ui-shell` patterns)
  - `.storybook/main.ts` - Storybook config with svelte-vite framework
  - `.storybook/preview.ts` - Preview config with dark theme
  - `.storybook/vitest.setup.ts` - Vitest setup for Storybook tests
  - `.storybook/storybook.css` - Storybook-specific CSS fixes
- [x] Create `vitest.config.js` with storybook test project
- [x] Create `eslint.config.js` using common config
- [x] Update `package.json` with Storybook dependencies and scripts
- [x] Update `tsconfig-base.json` with bundler module resolution
- [x] Create story decorator component (`_storybook/story-decorator.svelte`)
- [x] Create stories with play tests for all components:
  - `tabs/tabs.stories.svelte` - Default, With Badges, Tab Selection, Keyboard Navigation
  - `graphs-editor/var-sidebar.stories.svelte` - Output/Input Variables, Empty List, Mixed Types
  - `graphs-editor/slider-card.stories.svelte` - Default, With Errors, Remove Button
  - `graphs-editor/graph-card.stories.svelte` - Empty, Single/Multiple Variables, Drop Target, Errors
  - `graphs-editor/graphs-editor.stories.svelte` - Empty State, With Variables, Drop Zones

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

**Phase 5: Storybook Setup**
- Set up Storybook configuration following `packages/check-ui-shell` patterns
- Created `.storybook/` directory with main.ts, preview.ts, vitest.setup.ts, storybook.css
- Added vitest.config.js with storybook test project for running play tests
- Added eslint.config.js using common project config
- Updated package.json with Storybook dev dependencies and scripts:
  - `storybook` - Run dev server on port 6011
  - `test:storybook` - Run Storybook tests via vitest
- Updated tsconfig-base.json with `moduleResolution: "bundler"` for Storybook compatibility
- Created story decorator component for wrapping stories
- Created stories with play tests for all components:
  - Tabs: tab selection, keyboard navigation, badges
  - VarSidebar: variable lists, type badges, draggable items
  - SliderCard: value display, error states, remove button
  - GraphCard: chart display, variable table, title editing, error states
  - GraphsEditor: drag-and-drop zones, variable sidebars

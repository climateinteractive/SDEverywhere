# Check Editor Plan

## Initial Prompt

I want you to create a new component in the check-ui-shell package that allows the user to configure a new "check" test or
edit an existing one. See @packages/check-core/schema/check.schema.json for the schema for check tests. See
@examples/sample-check-tests/src/checks/checks.yaml for some concrete examples of check tests. What I'm envisioning is,
the user clicks a button to add a new "check" test. A big modal popover appears with your new component. It should start
the user off with a basic check test with simple defaults for scenario (use "all inputs at default" as the default
scenario), dataset (pick the first available output variable as the default), and predicate ("gt: 0"). For all of these
options, show a selector component (with typeahead filtering of variable names, etc). Show the selectors on the left side
and a graph on the right that shows a visual preview of how the test looks (you can decide what layout makes sense). You
can use the existing @packages/check-ui-shell/src/components/check/summary/check-summary-graph-box.svelte to show the
graph (I think). Be sure to follow TDD practices: create a Storybook stories file (follow the pattern used in other
stories.svelte files in that package) and define stories with story tests that exercise different cases. Go ahead and try
things, you don't need my input. Tell me when you have an initial component and storybook file ready for me to look at.

---

## Session History

### 2026-01-10: Initial Check Editor Component

Created the initial check-editor component with basic structure:
- `check-editor.svelte` - Main dialog component
- `check-editor-vm.ts` - Initial view model
- `check-editor.stories.svelte` - Storybook stories

### 2026-01-11: Component Refactoring and Multi-Item Support

**Morning session** - Svelte 5 migration and component architecture:
- Migrated list/selector components to Svelte 5 syntax
- Renamed view model files to `.svelte.ts` convention
- Split editor into separate subcomponents:
  - `scenario-selector.svelte`
  - `dataset-selector.svelte`
  - `predicate-selector.svelte`
  - `preview-graph.svelte`
- Updated PreviewGraph to show actual check graph visualization

**Afternoon session** - Multi-item support:
- Added support for multiple scenarios, datasets, and predicates
- Updated view model with item management (add/remove)
- Enhanced stories with multi-item test cases

### 2026-01-19: Layout, Navigation, and Selection

- Improved editor item layout and visual design
- Added navigation between items
- Implemented item selection handling
- Added typeahead-selector component for improved variable selection
- Added dialog component improvements
- Updated search-list and sel-list components
- Created this PLAN.md document

---

## Current Status

✅ All check-editor functionality implemented and working
✅ All 9 check-editor Storybook tests passing
✅ Real data preview functional
✅ Multi-item support fully operational
✅ Accessibility compliant
✅ Vitest configuration fixed

## Suggested Next Steps

### Immediate Improvements

1. **Predicate Value Validation**
   - Add min/max constraints to predicate value inputs
   - Add validation messages for invalid values
   - Consider adding step increments for numeric inputs

2. **Scenario Input Group UI**
   - The input-group scenario kind currently only accepts a text name
   - Consider adding a multi-select interface to choose which inputs belong to the group
   - Add visual feedback showing which inputs are in the selected group

3. **Dataset Reference UI Enhancement**
   - When predicate ref.kind is 'data', the scenario dropdown shows "Inherit"
   - Add tooltip or help text explaining what "Inherit" means
   - Consider showing the inherited scenario ID when applicable

4. **Empty State Handling**
   - Add empty state messages when no input/output variables are available
   - Disable "Add" buttons when no more items can be added
   - Show helpful messages guiding users on what to configure

### Future Enhancements

5. **Validation Before Save**
   - Validate that all required fields are filled before allowing save
   - Show validation errors inline for incomplete configurations
   - Consider disabling Save button until configuration is valid

6. **Configuration Presets**
   - Add ability to save/load common check configurations
   - Provide templates for common testing patterns:
     - "All inputs at extremes" preset
     - "Single variable sensitivity test" preset
     - "Baseline comparison" preset

7. **Drag and Drop Reordering**
   - Allow users to reorder scenarios, datasets, and predicates
   - This could help organize complex multi-item checks

8. **Graph Preview Improvements**
   - Show multiple graphs when multiple datasets are selected
   - Add visual indicators showing which predicate applies to which dataset
   - Consider split view or tabs for viewing different dataset comparisons

9. **Undo/Redo Support**
   - Add undo/redo for configuration changes
   - Particularly useful when making complex multi-item edits

10. **Configuration Summary View**
    - Add a read-only summary mode showing the complete check configuration
    - Export configuration as JSON for documentation purposes
    - Add "Copy configuration" button for sharing with team

### Code Quality

11. **Extract Common Patterns**
    - The three selector components share similar structure (header, add button, items list)
    - Consider creating a shared `SelectorSection` component to reduce duplication
    - Extract common styling into shared SCSS mixins

12. **Type Safety Improvements**
    - Add runtime validation for configuration objects
    - Consider using Zod or similar for schema validation
    - Add TypeScript discriminated unions for different config kinds

13. **Performance Optimization**
    - Consider memoizing selector view models to avoid recreation on each render
    - Add debouncing for rapid configuration changes that trigger data fetching
    - Profile graph rendering performance with large datasets

14. **Testing Coverage**
    - Add tests for invalid configurations
    - Add tests for edge cases (e.g., removing all but one item)
    - Consider adding integration tests that verify data fetching works correctly

## Architecture Notes

### Current Design Decisions

- **Single View Model**: All subcomponents share the same `CheckEditorViewModel` instance
  - Pro: Easy state synchronization across components
  - Pro: Simple prop drilling pattern
  - Con: Could become large as features grow

- **Inline Selector Creation**: Type/kind selectors are created in render functions
  - Pro: Keeps selector state local to each item
  - Con: Creates new instances on each render (potential optimization opportunity)

- **Minimum Item Enforcement**: UI prevents removal when only 1 item remains
  - Pro: Ensures valid configuration (at least one of each type required)
  - Con: Could be made more flexible if checks with 0 predicates are valid

### Alternative Approaches to Consider

- **Separate View Models**: Each selector could have its own view model
  - Would reduce coupling to main view model
  - Would require more explicit event handling between components

- **Form Validation Library**: Consider integrating a form validation library
  - Would standardize validation across all inputs
  - Would provide consistent error messaging

- **State Machine**: Complex multi-step configuration could benefit from explicit state machine
  - Would make valid transitions clearer
  - Would help with undo/redo implementation

## Related Files

### Core Implementation

- `src/components/check/editor/check-editor.svelte` - Main dialog component
- `src/components/check/editor/check-editor-vm.svelte.ts` - View model with state management
- `src/components/check/editor/scenario-selector.svelte` - Scenario configuration UI
- `src/components/check/editor/dataset-selector.svelte` - Dataset selection UI
- `src/components/check/editor/predicate-selector.svelte` - Predicate configuration UI
- `src/components/check/editor/preview-graph.svelte` - Graph preview wrapper

### Tests

- `src/components/check/editor/check-editor.stories.svelte` - Storybook stories with 9 test cases

### Dependencies

- `src/components/_shared/dialog.svelte` - Reusable dialog component
- `src/components/list/selector.svelte` - Dropdown selector component
- `src/components/check/summary/check-summary-graph-box.svelte` - Graph visualization component

### Configuration

- `vitest.config.js` - Test configuration (recently updated for Vitest 4.0)

# Agent Development Guide

A file for [guiding coding agents](https://agents.md/).

## Project Structure

- This is a monorepo.
- We use `pnpm` as our package manager, so always use commands like `pnpm {command}` instead of `npm {command}`.
- Common configuration files are kept in the top-level directory of this repository.
- Published packages are in the `packages` directory. Each package can be built and tested independently.
- Integration (end-to-end) tests are in the `tests` directory.
- Example apps and templates are in the `examples` directory.

## Commands

All commands below can be run directly from the project root using pnpm's filter (-F) option.
For example, to build only `packages/check-core`, run `pnpm -F check-core build`.

- **Build:** `pnpm -F {package} build`
- **Test (all test files in the package):** `pnpm -F {package} test`
- **Test (single test file in the package):** `pnpm -F {package} test {test_file}`
- **Type-check:** `pnpm -F {package} type-check`
- **Lint**: `pnpm -F {package} lint`
- **Run Storybook (in browser)**: `pnpm -F {package} storybook` (then open in browser, e.g., `http://localhost:6010`)
- **Run Storybook tests (headless)**: `pnpm -F {package} test:storybook`

## Workflow

- Always use test-driven development (TDD) practices:
  - Always write tests first (we use Vitest and put tests in `.spec.ts` files).
  - Always run the tests you write and verify that they fail.
  - DO NOT start implementing/changing code until you have proven that the tests run (but fail).
  - Begin implementing code/functions only after you have well-crafted tests.
  - Once you start implementing code, refrain from making changes to the tests.
  - If you need to make changes to the tests, ask your human first.
  - Iterate on the code until all tests are passing.
- When working on UI code (especially in the check-ui-shell package):
  - Write new Storybook stories whenever possible (in `.stories.svelte` files).
  - With each story, include a `play` function that verifies a particular UI behavior (or small set of related behaviors).
  - The same TDD practices above also apply when developing UI components with Storybook.
- Prefer running single tests, and not the whole test suite, for performance.
- Be sure to type-check and lint when you’re done making a series of code changes.

## Conventions

### General Conventions

- When in doubt, copy the patterns (language, structure, code comment frequency, etc) that you see in nearby files.

### File Naming Conventions

- All file and folder names should be kebab-case with all lowercase letters (or digits if necessary).
- Use a dash to separate words.
- We never use CamelCase names for file or folder names.

### Language Conventions

- This project uses [TypeScript](https://www.typescriptlang.org/) (`.ts`) syntax whenever possible.
- We always prefer TypeScript over JavaScript except in rare cases where JavaScript has been used extensively in the past.
- Make sure each new file starts with a copyright header, for example:
  ```ts
  // Copyright (c) {YEAR} Climate Interactive / New Venture Fund
  ```
- Add TSDoc comments to all interfaces, classes, methods, functions, fields (basically any declaration). See "Code Documentation Conventions" below.

### Code Documentation Conventions

- This project uses [TSDoc](https://tsdoc.org/)-style comments for documenting TypeScript code.
- Note that TSDoc is very similar to JSDoc but TSDoc is more standard for TypeScript code.
- Add TSDoc comments to all interfaces, classes, methods, functions, fields (basically any declaration).
- Each comment should end with a period.
- Method and function comments should start with a verb without an "s" on the end, for example, "Update the record..." instead of "Updates the record...".
- Parameter declarations using `@param` should not include a "-" after the variable name, and the sentence should always end ending with a period.
- For `@returns` and `@throws`, the sentence should always start with an uppercase letter and end with a period.
- Include a blank line between the method/function comments and the first `@param` line.

### Svelte Conventions

- Our `.svelte` files use a consistent structure as defined in the following rules.
- Make sure each new file starts with a copyright header, for example:
  ```svelte
  <!-- Copyright (c) {YEAR} Climate Interactive / New Venture Fund -->
  ```
- We always use the following order for the 3 sections: script, template, style. This is enforced by the Prettier settings in `.prettierrc`, but it is always preferred to use this order when adding new code (even before prettier runs).
- We put an HTML comment above each of the 3 sections to make it easier to see the section delineations at a glance. For example:
  ```svelte
  <!-- SCRIPT -->
  <script lang="ts">
  const version = 1
  </script>
  ```

#### Script Section

- We always use TypeScript, so the `lang` attribute of the `<script>` element should be set to "ts".
- The conventions for TypeScript files as documented in "Language Conventions" above are also applicable to the TypeScript code in the `<script>` sections of `.svelte` files.
- We don't use a leading indent for this section. This is enforced by the Prettier settings in `.prettierrc`, but it is always preferred to not indent lines when adding new code.

#### Template Section

- We always use HTML (the default) so there is no need for surrounding this section with `<template>` tags, but do always precede the first line of the HTML template with a `<!-- TEMPLATE -->` comment as instructed above.
- We NEVER use Tailwind. We always use plain CSS (or SCSS when mixins are needed). Don't include Tailwind styles when suggesting new code.

#### Style Section

- We always use SCSS, so the `lang` attribute of the `<style>` element should be set to "scss".
- We don't use a leading indent for this section. This is enforced by the Prettier settings in `.prettierrc`, but it is always preferred to not indent lines when adding new code.
- We prefix each selector with the name of the component. For example, if the component file is `my-button.svelte`, each CSS selector in the `<style>` section should start with `.my-button`, for example `.my-button-icon`.
- Don't overuse CSS nesting. It is acceptable to use nesting for specifying styles for different states of an element to keep the related styling grouped together. Don't use nesting simply for mirroring the hierarchy of the elements.

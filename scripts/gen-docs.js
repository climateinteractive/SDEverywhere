#!/usr/bin/env node

//
// This script runs `typedoc` for the package in the current working directory and
// makes some text substitutions, for example to insert links to API docs for types
// that are defined in a separate package.
//

import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve as resolvePath } from 'path'
import glob from 'glob'

// By default, replace all links to the typedoc-generated `entry.md` with a link to our
// own customized `index.md`.  More replacements can be defined on a per-project basis
// by including a `.typedoc/replacements.json` file.
const replacements = [['entry.md', 'index.md']]

function applyReplacements(filePath) {
  // Read the source file
  const src = readFileSync(filePath).toString()

  // Replace all occurrences of each listed type with a link to the docs for that type
  let edited = src
  for (const r of replacements) {
    edited = edited.replaceAll(r[0], r[1])
  }

  // Write the edited content back to the same location
  writeFileSync(filePath, edited)
}

function main() {
  // Remove the existing generated docs
  execSync(`find ./docs -mindepth 1 ! -name 'index.md' -delete`)

  // Load more project-specific replacements from the `.typedoc/replacements.json` file
  const replacementsFile = resolvePath('.typedoc', 'replacements.json')
  if (existsSync(replacementsFile)) {
    const json = readFileSync(replacementsFile)
    const projReplacements = JSON.parse(json)
    for (const r of projReplacements) {
      replacements.push(r)
    }
  }

  // Generate the docs for the current package
  const typedocCmd = `typedoc \
--tsconfig ./tsconfig-build.json \
--sort source-order \
--excludeExternals \
--excludePrivate \
--disableSources \
--readme none \
--githubPages false \
--plugin typedoc-plugin-markdown \
--entryDocument entry.md \
--hideInPageTOC \
--hideMembersSymbol \
--allReflectionsHaveOwnDocument \
--objectLiteralTypeDeclarationStyle list \
--out docs \
--cleanOutputDir false \
src/index.ts`
  execSync(typedocCmd)

  // List all files in the docs directory
  glob('docs/**/*.md', {}, (_, files) => {
    // Edit each file to apply the replacements
    for (const f of files) {
      applyReplacements(f)
    }
  })
}

main()

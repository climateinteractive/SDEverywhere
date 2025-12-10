#!/usr/bin/env node

/**
 * Builds the app and model-check reports and copies the build products to the `artifacts` branch.
 *
 * Usage: node ci-build.js
 */

import { execSync } from 'node:child_process'

// Build the app and model-check report
console.log('Building the app and model-check report...')
execSync('npm run build', { stdio: 'inherit' })

// Add other build and test steps here...

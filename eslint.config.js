import { defineConfig } from 'eslint/config'
import commonConfig from './eslint-config-common.js'

// This is the ESLint configuration used for the helper scripts in the `scripts`
// directory (see the `lint-scripts` script in `package.json`).  Each package in
// the monorepo has its own configuration in its `eslint.config.js` file.
export default defineConfig([...commonConfig])

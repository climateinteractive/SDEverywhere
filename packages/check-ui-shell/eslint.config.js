import { defineConfig, globalIgnores } from 'eslint/config'
import { allRulesWithoutSvelte } from '../../eslint-config-common.js'

// TODO: For now we exclude Svelte files from linting because it doesn't understand Pug syntax
// and reports many unused variables.  Once we convert Pug to HTML, we can switch to using
// `commonConfig` so that Svelte files are linted.
export default defineConfig([globalIgnores(['dist/']), ...allRulesWithoutSvelte])

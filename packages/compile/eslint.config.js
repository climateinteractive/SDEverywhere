import { defineConfig, globalIgnores } from 'eslint/config'
import commonConfig from '../../eslint-config-common.js'

export default defineConfig([
  // The `dts-tmp` and `dist` directories only contain type declarations that are
  // generated from the JSDoc comments in the sources, so there is no need to lint them
  globalIgnores(['dts-tmp', 'dist']),
  commonConfig
])

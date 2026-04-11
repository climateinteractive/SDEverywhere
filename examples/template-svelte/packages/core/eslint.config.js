import { defineConfig, globalIgnores } from 'eslint/config'
import commonConfig from '../../eslint-config-common.js'

export default defineConfig([globalIgnores(['dist/', 'src/model/generated/*.js']), ...commonConfig])

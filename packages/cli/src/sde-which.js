import path from 'path'

import { parentDirForFileUrl } from './utils.js'

let command = 'which'
let describe = 'print the SDEverywhere home directory'
let builder = {}
let handler = argv => {
  which(argv)
}
let which = () => {
  // The SDEverywhere home directory is one level above the src directory where this code runs.
  let srcDir = parentDirForFileUrl(import.meta.url)
  let homeDir = path.resolve(srcDir, '..')
  console.log(homeDir)
}
export default {
  command,
  describe,
  builder,
  handler,
  which
}

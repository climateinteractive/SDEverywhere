import path from 'path'

let command = 'which'
let describe = 'print the SDEverywhere home directory'
let builder = {}
let handler = argv => {
  which(argv)
}
let which = opts => {
  // The SDEverywhere home directory is one level above the src directory where this code runs.
  let homeDir = path.resolve(new URL('..', import.meta.url).pathname)
  console.log(homeDir)
}
export default {
  command,
  describe,
  builder,
  handler,
  which
}

const path = require('path')

let command = 'which'
let describe = 'print the SDEverywhere home directory'
let builder = {}
let handler = argv => {
  which(argv)
}
let which = opts => {
  // The SDEverywhere home directory is one level above the src directory where this code runs.
  let homeDir = path.join(__dirname, '..')
  console.log(homeDir)
}
module.exports = {
  command,
  describe,
  builder,
  handler,
  which
}

const fs = require('fs-extra')
const path = require('path')
const sh = require('shelljs')
const moment = require('moment')
const { mdlPathProps } = require('./Helpers')

exports.command = 'run <model>'
exports.describe = 'build a model, run it, and capture its output to a file'
exports.builder = {
  builddir: {
    describe: 'build directory (defaults to ./build)',
    type: 'string',
    alias: 'b'
  }
}
exports.handler = argv => {
}

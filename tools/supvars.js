const fs = require('fs')

let print = s => {
  console.log(s)
}
let pathname = process.argv[2]
if (!pathname) {
  print('usage: supvars pathname')
  process.exit()
}
let lines = fs.readFileSync(pathname, 'utf8').split(/\r?\n/)
let lineNum = 0
let prevLineBlank = false
let varName = ''
for (let line of lines) {
  if (line.startsWith('\\\\\\---/// Sketch')) {
    break
  }
  lineNum++
  if (line === '') {
    prevLineBlank = true
    continue
  }
  if (prevLineBlank) {
    let m = line.match(/(^[^=]*)=/)
    if (m) {
      varName = m[1]
    }
    prevLineBlank = false
    continue
  }
  if (line.includes(':SUPPLEMENTARY')) {
    print(varName)
    continue
  }
}

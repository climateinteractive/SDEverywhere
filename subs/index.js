let R = require('ramda')
let fs = require('fs')
let inputPathname = process.argv[2]
if (inputPathname) {
  let buf = fs.readFileSync(inputPathname, 'utf8')
  let lines = buf.toString().split('\n')
  let result = []
  console.log('[')
  for (let line of lines) {
    if (line.length > 0) {
      if (line.match(/^\/\//)) {
        console.log(line)
      } else {
        console.log(`// ${line}`)
        let [name, indices] = line.split(':')
        let values = R.map(value => value.trim(), indices.split(','))
        console.log({ name: name, value: values })
        console.log(',')
        for (let [i, value] of values.entries()) {
          console.log({ name: value, value: i, family: name })
          console.log(',')
        }
      }
    }
  }
  console.log(']')
} else {
  console.log('subs vensim-subs-file')
}

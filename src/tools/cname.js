const fs = require('fs-extra')

let print = s => {
  console.log(s)
}
let pathname = process.argv[2]
if (!pathname) {
  print('usage: cname pathname')
  process.exit()
}
let data = fs.readFileSync(pathname, 'utf8').split(/\r?\n/)
for (let line of data) {
  if (line !== '') {
    // print(`${line} → ${canonicalName(line)}`);
    let refId = removeSubscripts(canonicalName(line))
    print(refId)
  }
}

function canonicalName(name) {
  // Format a model variable name into a valid C identifier.
  // The name is normalized by removing quotes, replacing spaces, periods, and dashes with underscores,
  // and converting to lower case, since Vensim ids are case-insensitive. Spaces at the
  // beginning and ending of names are discarded. An underscore is prepended to the name
  // because Vensim names can begin with numbers, which is not valid in C.
  return (
    '_' +
    name
      .replace(/"/g, '')
      .trim()
      .replace(/\s+!$/g, '!')
      .replace(/\s/g, '_')
      .replace(/,/g, '_')
      .replace(/-/g, '_')
      .replace(/\./g, '_')
      .toLowerCase()
  )
}
function removeSubscripts(name) {
  return name.replace(/\[.*/, '')
}

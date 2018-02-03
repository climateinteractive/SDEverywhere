const strings = require('./strings')
const log = require('./log')

// Localized strings
exports.setLanguage = lang => {
  exports.language = lang
}
exports.str = id => {
  let string
  try {
    if (id in strings) {
      string = strings[id][exports.language]
    }
  } catch (e) {
    console.error(e.stack)
  }
  if (!string) {
    log(`string id "${id}" not found for language ${exports.language}`)
    string = ''
  }
  return string
}

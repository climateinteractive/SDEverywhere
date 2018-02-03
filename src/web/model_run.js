var log = require('./log')

let run_model

let run = inputs => {
  // The model run function is obtained from the Emscripten global Module object.
  if (!run_model) {
    // The Emscripten Module object was previously injected into the global namespace.
    run_model = Module.cwrap('run_model', 'string', ['string'])
  }
  return new Promise((resolve, reject) => {
    let outputs = run_model(inputs)
    resolve(outputs)
  })
}
module.exports = { run }

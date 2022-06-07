module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    // This is needed so that eslint doesn't complain about the use of
    // Map and Set types in JS sources
    es6: true
  },
  extends: ['eslint:recommended', 'plugin:eslint-comments/recommended', 'prettier']
}

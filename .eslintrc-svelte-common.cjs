module.exports = {
  extends: ['./.eslintrc-ts-common.cjs'],
  plugins: ['svelte3'],
  overrides: [
    {
      files: ['*.svelte'],
      processor: 'svelte3/svelte3',
      rules: {
        // XXX: Until `eslint-plugin-svelte3` supports the preprocessors that we use
        // (i.e., Pug and Sass), we need to ignore all warnings related to unused
        // variables, etc.  Currently the svelte3 plugin doesn't understand that
        // TypeScript variables in the script section are actually used in the Pug
        // template section, and reports those as being unused.  For now, we ignore
        // warnings in Svelte files and only fail if a lint error is encountered.
        // This is not ideal, but the best we can do until the following issue
        // is resolved:
        //   https://github.com/sveltejs/eslint-plugin-svelte3/issues/10
        //   https://github.com/sveltejs/eslint-plugin-svelte3/pull/62
        '@typescript-eslint/no-unused-vars': 'off'
      }
    }
  ],
  settings: {
    'svelte3/typescript': true,
    // XXX: See comment above regarding svelte3 warnings
    'svelte3/ignore-warnings': () => true,
    'svelte3/ignore-styles': () => true
  }
}

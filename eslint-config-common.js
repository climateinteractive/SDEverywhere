import eslint from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import eslintComments from 'eslint-plugin-eslint-comments'
import sveltePlugin from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

const commonPlugins = {
  '@typescript-eslint': tseslint,
  'eslint-comments': eslintComments
}

const commonRules = {
  ...tseslint.configs.recommended.rules,
  ...eslintComments.configs.recommended.rules,
  // XXX: The following two lines are needed to avoid false positives in function types, see:
  //   https://stackoverflow.com/questions/63767199/typescript-eslint-no-unused-vars-false-positive-in-type-declarations
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'all', caughtErrorsIgnorePattern: '^_' }],
  'no-unused-private-class-members': 'error',
  '@typescript-eslint/consistent-type-imports': 'error',
  // XXX: Disable the "no-undef" rule, since it is not helpful for TS files, see:
  //   https://typescript-eslint.io/troubleshooting/faqs/eslint
  'no-undef': 'off'
}

export const jsAndTsRules = {
  files: ['**/*.{js,ts}'],
  languageOptions: {
    parser: tsparser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    globals: {
      ...globals.browser,
      ...globals.node
    }
  },
  plugins: {
    ...commonPlugins
  },
  rules: {
    ...commonRules
  }
}

export const svelteRules = {
  files: ['**/*.svelte', '**/*.svelte.ts'],
  languageOptions: {
    parser: svelteParser,
    parserOptions: {
      parser: tsparser,
      extraFileExtensions: ['.svelte'],
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    globals: globals.browser
  },
  plugins: {
    ...commonPlugins,
    svelte: sveltePlugin
  },
  rules: {
    ...commonRules,
    ...sveltePlugin.configs.recommended.rules
  }
}

export const allRules = [eslint.configs.recommended, jsAndTsRules, svelteRules, prettier]

export default allRules

import eslintComments from '@eslint-community/eslint-plugin-eslint-comments'
import eslint from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

const commonPlugins = {
  '@typescript-eslint': tseslint,
  '@eslint-community/eslint-comments': eslintComments
}

const commonRules = {
  ...tseslint.configs.recommended.rules,
  ...eslintComments.configs.recommended.rules,
  // XXX: The following two lines are needed to avoid false positives in function types, see:
  //   https://stackoverflow.com/questions/63767199/typescript-eslint-no-unused-vars-false-positive-in-type-declarations
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': ['error'],
  'no-unused-private-class-members': 'error',
  '@typescript-eslint/consistent-type-imports': 'error',
  // XXX: Disable the "no-undef" rule, since it is not helpful for TS files, see:
  //   https://typescript-eslint.io/troubleshooting/faqs/eslint
  'no-undef': 'off'
}

export default [
  eslint.configs.recommended,
  {
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
  },
  prettier
]

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, mergeConfig } from 'vitest/config'

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'

import viteConfig from './vite.config.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(() =>
  mergeConfig(
    viteConfig,
    defineConfig({
      test: {
        projects: [
          // This project runs the TypeScript (non-Storybook) tests
          {
            extends: true,
            test: {
              name: 'ts'
            }
          },
          // This project runs the Storybook tests; more info at:
          //   https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
          {
            extends: true,
            plugins: [
              storybookTest({
                configDir: path.join(dirname, '.storybook'),
                storybookScript: 'pnpm storybook --ci'
              })
            ],
            test: {
              name: 'storybook',
              browser: {
                enabled: true,
                provider: 'playwright',
                headless: true,
                instances: [{ browser: 'chromium' }]
              },
              setupFiles: ['./.storybook/vitest.setup.ts']
            }
          }
        ]
      }
    })
  )
)

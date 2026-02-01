// Copyright (c) 2026 Climate Interactive / New Venture Fund

import type { StorybookConfig } from '@storybook/svelte-vite'

// XXX: Allow for running a single stories file by setting the STORIES environment variable
const storiesFileName = process.env.STORIES || '*'

const config: StorybookConfig = {
  stories: [`../src/**/${storiesFileName}.stories.@(js|jsx|mjs|ts|tsx|svelte)`],

  addons: ['@storybook/addon-links', '@storybook/addon-svelte-csf', '@storybook/addon-docs', '@storybook/addon-vitest'],

  framework: {
    name: '@storybook/svelte-vite',
    options: {}
  }
}

export default config

import type { StorybookConfig } from '@storybook/svelte-vite'

// XXX: Allow for running a single story by setting the STORY environment variable
const storyName = process.env.STORY || '*'

const config: StorybookConfig = {
  stories: [`../src/**/${storyName}.stories.@(js|jsx|mjs|ts|tsx|svelte)`],

  addons: ['@storybook/addon-links', '@storybook/addon-svelte-csf', '@storybook/addon-docs', '@storybook/addon-vitest'],

  framework: {
    name: '@storybook/svelte-vite',
    options: {}
  }
}

export default config

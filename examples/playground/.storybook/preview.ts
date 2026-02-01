// Copyright (c) 2026 Climate Interactive / New Venture Fund

import type { Preview } from '@storybook/svelte-vite'
import { themes } from 'storybook/theming'
import '../src/global.css'
import './storybook.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    docs: {
      theme: themes.dark
    }
  }
}

export default preview

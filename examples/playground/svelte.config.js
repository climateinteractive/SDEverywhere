import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
  preprocess: vitePreprocess(),
  onwarn: (warning, defaultHandler) => {
    // TODO: We should resolve these warnings instead of ignoring them
    if (warning.code === 'a11y-click-events-have-key-events') {
      return
    }
    if (warning.code === 'a11y-no-noninteractive-tabindex') {
      return
    }

    // Handle all other warnings normally
    defaultHandler(warning)
  }
}

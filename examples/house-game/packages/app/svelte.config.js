import { sveltePreprocess } from 'svelte-preprocess'

export default {
  preprocess: sveltePreprocess({}),
  onwarn: (warning, defaultHandler) => {
    // TODO: We should resolve these warnings instead of ignoring them
    switch (warning.code) {
      case 'a11y-click-events-have-key-events':
      case 'a11y-no-noninteractive-tabindex':
      case 'a11y-no-static-element-interactions':
        return
      default:
        break
    }

    // Handle all other warnings normally
    defaultHandler(warning)
  }
}

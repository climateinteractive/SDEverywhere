import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    warningFilter: warning => {
      // TODO: We should resolve these warnings instead of ignoring them
      switch (warning.code) {
        case 'a11y_click_events_have_key_events':
        case 'a11y_no_noninteractive_tabindex':
        case 'a11y_no_static_element_interactions':
          return false
        default:
          return true
      }
    }
  }
}

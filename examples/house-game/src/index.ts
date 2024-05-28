import { createAppViewModel } from './app-vm'
import App from './app.svelte'

const appViewModel = await createAppViewModel()
const app = new App({
  target: document.body,
  props: {
    appViewModel
  }
})

export default app

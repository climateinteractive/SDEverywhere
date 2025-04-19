import { createAppViewModel } from './app-vm'
import App from './app.svelte'

let app: App
createAppViewModel().then(appViewModel => {
  app = new App({
    target: document.body,
    props: {
      viewModel: appViewModel
    }
  })
})

export default app

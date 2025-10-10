import { mount } from 'svelte'

import { createAppViewModel } from './app-vm'
import App from './app.svelte'

createAppViewModel().then(appViewModel => {
  mount(App, {
    target: document.body,
    props: {
      viewModel: appViewModel
    }
  })
})

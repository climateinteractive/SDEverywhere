// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { mount } from 'svelte'

import App from './app.svelte'

const app = mount(App, {
  target: document.body
})

export default app

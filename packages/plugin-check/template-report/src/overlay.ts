// Copyright (c) 2022 Climate Interactive / New Venture Fund

import messagesHtml from '@_prep_/messages.html?raw'

// This constant is exported only for HMR handling within this file; it is
// not intended to be consumed by outside modules
export const messages = messagesHtml

// Note that this initialization of the dev overlay component is kept in a
// separate file so that updates to `messages.html` cause HMR to reload only
// this file and the overlay element (rather than reloading the entire app)
export function initOverlay(): void {
  updateOverlay(messages)
}

function updateOverlay(m: string): void {
  const content = document.getElementById('overlay-content')
  content.style.display = m && m.length > 0 ? 'unset' : 'none'
  const text = document.getElementById('overlay-text')
  text.innerHTML = m
}

// In dev mode (with HMR enabled), when the `messages.html` file is updated,
// reload its contents into the overlay here instead of having the change
// event propagate up to the app shell.  This makes the HMR event more
// precise and makes the text change show up immediately without having
// to reload other parts of the app.
if (import.meta.hot) {
  import.meta.hot.accept(newModule => {
    updateOverlay(newModule.messages)
  })
}

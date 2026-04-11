import rawMessagesHtml from '@prep/messages.html?raw'

export const messagesHtml = rawMessagesHtml

export function initOverlay() {
  const overlayElem = document.getElementsByClassName('overlay-container')[0]
  updateOverlay(overlayElem, messagesHtml)
}

function updateOverlay(elem, messages) {
  if (messages.length > 0) {
    elem.innerHTML = messages
    elem.style.display = 'flex'
  } else {
    elem.style.display = 'none'
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(newModule => {
    const overlayElem = document.getElementsByClassName('overlay-container')[0]
    updateOverlay(overlayElem, newModule.messagesHtml)
  })
}

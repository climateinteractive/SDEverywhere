// Copyright (c) 2024 Climate Interactive / New Venture Fund. All rights reserved.

/** Dispatch an event when click event occurs outside of the given element. */
export function clickOutside(element: HTMLElement) {
  // This implementation is based on:
  //   https://svelte.dev/repl/0ace7a508bd843b798ae599940a91783?version=3.16.7

  const handleClick = (event: Event) => {
    if (element && !element.contains(event.target as HTMLElement) && !event.defaultPrevented) {
      element.dispatchEvent(new CustomEvent('clickout'))
    }
  }

  document.addEventListener('click', handleClick, true)

  return {
    destroy() {
      document.removeEventListener('click', handleClick, true)
    }
  }
}

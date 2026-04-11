// Copyright (c) 2025 Climate Interactive / New Venture Fund

/**
 * Return true if the keyboard event is from an editable element (e.g., `<input>`,
 * `<textarea>`, `<select>`, etc.).
 */
export function isEventFromEditableElement(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

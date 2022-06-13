// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'
import { derived, writable } from 'svelte/store'

export interface WizardCardDescViewModel {
  subject: Writable<string>
  expectation: Writable<string>
  valid: Readable<boolean>
}

export function createDescCardViewModel(): WizardCardDescViewModel {
  const subject: Writable<string> = writable('')
  const expectation: Writable<string> = writable('')
  const valid: Readable<boolean> = derived([subject, expectation], ([$s, $e]) => {
    return $s.trim().length > 0 && $e.trim().length > 0
  })

  return {
    subject,
    expectation,
    valid
  }
}

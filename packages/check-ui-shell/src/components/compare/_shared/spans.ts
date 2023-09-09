// Copyright (c) 2023 Climate Interactive / New Venture Fund

/**
 * Return an string containing an HTML `<span>` element with the appropriate
 * color for the given bundle side (left or right).
 */
export function datasetSpan(name: string, side: 'left' | 'right'): string {
  const color = side === 'left' ? 0 : 1
  return `<span class="dataset-color-${color}">${name}</span>`
}

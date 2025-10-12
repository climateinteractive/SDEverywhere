// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { TraceGroupViewModel } from './trace-group-vm'
import type { TracePointViewModel } from './trace-row-vm'

export interface SquarePosition {
  groupIndex: number
  rowIndex: number
  pointIndex: number
}

export interface NavigationDependencies {
  groups: TraceGroupViewModel[]
  currentPosition: SquarePosition | undefined
}

function isDiffSquare(point: TracePointViewModel): boolean {
  return point.hasDiff
}

export function findFirstRedSquare(groups: TraceGroupViewModel[]): SquarePosition | undefined {
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex]
    for (let rowIndex = 0; rowIndex < group.rows.length; rowIndex++) {
      const row = group.rows[rowIndex]
      for (let pointIndex = 0; pointIndex < row.points.length; pointIndex++) {
        const point = row.points[pointIndex]
        if (isDiffSquare(point)) {
          return { groupIndex, rowIndex, pointIndex }
        }
      }
    }
  }
  return undefined
}

export function findLastRedSquare(groups: TraceGroupViewModel[]): SquarePosition | undefined {
  for (let groupIndex = groups.length - 1; groupIndex >= 0; groupIndex--) {
    const group = groups[groupIndex]
    for (let rowIndex = group.rows.length - 1; rowIndex >= 0; rowIndex--) {
      const row = group.rows[rowIndex]
      for (let pointIndex = row.points.length - 1; pointIndex >= 0; pointIndex--) {
        const point = row.points[pointIndex]
        if (isDiffSquare(point)) {
          return { groupIndex, rowIndex, pointIndex }
        }
      }
    }
  }
  return undefined
}

export function findNextRedSquare(deps: NavigationDependencies): SquarePosition | undefined {
  const { groups, currentPosition } = deps

  if (!currentPosition) {
    return findFirstRedSquare(groups)
  }

  const currentGroupIndex = currentPosition.groupIndex
  const currentRowIndex = currentPosition.rowIndex
  const currentPointIndex = currentPosition.pointIndex

  // First, try to find the next variable at the current time
  for (let groupIndex = currentGroupIndex; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex]
    const startRowIndex = groupIndex === currentGroupIndex ? currentRowIndex + 1 : 0

    for (let rowIndex = startRowIndex; rowIndex < group.rows.length; rowIndex++) {
      const row = group.rows[rowIndex]
      const point = row.points[currentPointIndex]
      if (point && isDiffSquare(point)) {
        return {
          groupIndex: groupIndex,
          rowIndex: rowIndex,
          pointIndex: currentPointIndex
        }
      }
    }
  }

  // Calculate the maximum number of points across all rows
  // TODO: We could calculate this while iterating, which would avoid a second pass
  const maxPoints = Math.max(...groups.flatMap(group => group.rows.map(row => row.points.length)))

  // If no more variables at current time, find the next time with any red squares
  for (let pointIndex = currentPointIndex + 1; pointIndex < maxPoints; pointIndex++) {
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const group = groups[groupIndex]
      for (let rowIndex = 0; rowIndex < group.rows.length; rowIndex++) {
        const row = group.rows[rowIndex]
        if (pointIndex < row.points.length) {
          const point = row.points[pointIndex]
          if (point && isDiffSquare(point)) {
            return { groupIndex, rowIndex, pointIndex }
          }
        }
      }
    }
  }

  // If we've reached the end, wrap around to the first red square
  return findFirstRedSquare(groups)
}

export function findPreviousRedSquare(deps: NavigationDependencies): SquarePosition | undefined {
  const { groups, currentPosition } = deps

  if (!currentPosition) {
    return findLastRedSquare(groups)
  }

  const currentGroupIndex = currentPosition.groupIndex
  const currentRowIndex = currentPosition.rowIndex
  const currentPointIndex = currentPosition.pointIndex

  // First, try to find the previous variable at the current time
  for (let groupIndex = currentGroupIndex; groupIndex >= 0; groupIndex--) {
    const group = groups[groupIndex]
    const endRowIndex = groupIndex === currentGroupIndex ? currentRowIndex - 1 : group.rows.length - 1

    for (let rowIndex = endRowIndex; rowIndex >= 0; rowIndex--) {
      const row = group.rows[rowIndex]
      const point = row.points[currentPointIndex]
      if (point && isDiffSquare(point)) {
        return { groupIndex, rowIndex, pointIndex: currentPointIndex }
      }
    }
  }

  // If no more variables at current time, find the previous time with any red squares
  for (let pointIndex = currentPointIndex - 1; pointIndex >= 0; pointIndex--) {
    for (let groupIndex = groups.length - 1; groupIndex >= 0; groupIndex--) {
      const group = groups[groupIndex]
      for (let rowIndex = group.rows.length - 1; rowIndex >= 0; rowIndex--) {
        const row = group.rows[rowIndex]
        if (pointIndex < row.points.length) {
          const point = row.points[pointIndex]
          if (point && isDiffSquare(point)) {
            return { groupIndex, rowIndex, pointIndex }
          }
        }
      }
    }
  }

  // If we've reached the beginning, wrap around to the last red square
  return findLastRedSquare(groups)
}

export function handleKeyDown(
  event: KeyboardEvent,
  groups: TraceGroupViewModel[],
  currentPosition: SquarePosition | undefined
): SquarePosition | undefined {
  let newPosition: SquarePosition | undefined

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      newPosition = findPreviousRedSquare({ groups, currentPosition })
      break
    case 'ArrowRight':
      event.preventDefault()
      newPosition = findNextRedSquare({ groups, currentPosition })
      break
    case 'Home':
      event.preventDefault()
      newPosition = findFirstRedSquare(groups)
      break
    case 'End':
      event.preventDefault()
      newPosition = findLastRedSquare(groups)
      break
    default:
      return undefined
  }

  return newPosition
}

// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { TraceGroupViewModel } from './trace-group-vm'
import type { TracePointViewModel, TraceRowViewModel } from './trace-row-vm'
import {
  findFirstRedSquare,
  findLastRedSquare,
  findNextRedSquare,
  findPreviousRedSquare,
  handleKeyDown,
  type NavigationDependencies,
  type SquarePosition
} from './trace-nav'

const diffPoint: TracePointViewModel = {
  hasDiff: true,
  color: 'crimson'
}

const noDiffPoint: TracePointViewModel = {
  hasDiff: false,
  color: 'green'
}

const noDataPoint: TracePointViewModel = {
  color: 'gray'
}

function row(points: TracePointViewModel[]): TraceRowViewModel {
  return {
    points,
    datasetKey: 'test',
    varName: 'test'
  }
}

function group(rows: TraceRowViewModel[]): TraceGroupViewModel {
  return {
    title: 'Test Group',
    rows
  }
}

function pos(groupIndex: number, rowIndex: number, pointIndex: number): SquarePosition {
  return {
    groupIndex,
    rowIndex,
    pointIndex
  }
}

describe('findFirstRedSquare', () => {
  it('should return the first red square', () => {
    const groups = [group([row([noDiffPoint, diffPoint, diffPoint])])]

    const result = findFirstRedSquare(groups)
    expect(result).toEqual(pos(0, 0, 1))
  })

  it('should return undefined when no red squares exist', () => {
    const groups = [group([row([noDiffPoint, noDiffPoint, noDiffPoint])])]

    const result = findFirstRedSquare(groups)
    expect(result).toBeUndefined()
  })

  it('should skip empty points', () => {
    const groups = [group([row([noDataPoint, diffPoint, noDiffPoint])])]

    const result = findFirstRedSquare(groups)
    expect(result).toEqual(pos(0, 0, 1))
  })
})

describe('findLastRedSquare', () => {
  it('should return the last red square', () => {
    const groups = [group([row([diffPoint, diffPoint, noDiffPoint])])]

    const result = findLastRedSquare(groups)
    expect(result).toEqual(pos(0, 0, 1))
  })

  it('should return undefined when no red squares exist', () => {
    const groups = [group([row([noDiffPoint, noDiffPoint, noDiffPoint])])]

    const result = findLastRedSquare(groups)
    expect(result).toBeUndefined()
  })
})

describe('findNextRedSquare', () => {
  it('should find next red square in same time point', () => {
    const groups = [group([row([noDiffPoint, diffPoint, noDiffPoint]), row([noDiffPoint, diffPoint, noDiffPoint])])]

    const deps: NavigationDependencies = {
      groups,
      currentPosition: pos(0, 0, 1)
    }

    const result = findNextRedSquare(deps)
    expect(result).toEqual(pos(0, 1, 1))
  })

  it('should find next red square in next time point when none in current', () => {
    const groups = [group([row([noDiffPoint, noDiffPoint, diffPoint])])]

    const deps: NavigationDependencies = {
      groups,
      currentPosition: pos(0, 0, 1)
    }

    const result = findNextRedSquare(deps)
    expect(result).toEqual(pos(0, 0, 2))
  })

  it('should wrap around to first red square when at end', () => {
    const groups = [group([row([diffPoint, noDiffPoint, noDiffPoint])])]

    const deps: NavigationDependencies = {
      groups,
      currentPosition: pos(0, 0, 2)
    }

    const result = findNextRedSquare(deps)
    expect(result).toEqual(pos(0, 0, 0))
  })

  it('should return first red square when no current position', () => {
    const groups = [group([row([noDiffPoint, diffPoint, noDiffPoint])])]

    const deps: NavigationDependencies = {
      groups,
      currentPosition: undefined
    }

    const result = findNextRedSquare(deps)
    expect(result).toEqual(pos(0, 0, 1))
  })
})

describe('findPreviousRedSquare', () => {
  it('should find previous red square in same time point', () => {
    const groups = [group([row([diffPoint, noDiffPoint, diffPoint]), row([noDiffPoint, noDiffPoint, diffPoint])])]

    const deps: NavigationDependencies = {
      groups,
      currentPosition: pos(0, 1, 2)
    }

    const result = findPreviousRedSquare(deps)
    expect(result).toEqual(pos(0, 0, 2))
  })

  it('should find previous red square in previous time point when none in current', () => {
    const groups = [group([row([diffPoint, noDiffPoint, noDiffPoint])])]

    const deps: NavigationDependencies = {
      groups,
      currentPosition: pos(0, 0, 1)
    }

    const result = findPreviousRedSquare(deps)
    expect(result).toEqual(pos(0, 0, 0))
  })

  it('should wrap around to last red square when at beginning', () => {
    const groups = [group([row([noDiffPoint, noDiffPoint, diffPoint])])]

    const deps: NavigationDependencies = {
      groups,
      currentPosition: pos(0, 0, 0)
    }

    const result = findPreviousRedSquare(deps)
    expect(result).toEqual(pos(0, 0, 2))
  })

  it('should return last red square when no current position', () => {
    const groups = [group([row([noDiffPoint, diffPoint, noDiffPoint])])]

    const deps: NavigationDependencies = {
      groups,
      currentPosition: undefined
    }

    const result = findPreviousRedSquare(deps)
    expect(result).toEqual(pos(0, 0, 1))
  })
})

describe('handleKeyDown', () => {
  it('should handle ArrowLeft key', () => {
    const groups = [group([row([diffPoint, noDiffPoint, diffPoint])])]

    const mockEvent = {
      key: 'ArrowLeft',
      preventDefault: () => {}
    } as KeyboardEvent

    const newPos = handleKeyDown(mockEvent, groups, pos(0, 0, 2))
    expect(newPos).toEqual(pos(0, 0, 0))
  })

  it('should handle ArrowRight key', () => {
    const groups = [group([row([diffPoint, noDiffPoint, diffPoint])])]

    const mockEvent = {
      key: 'ArrowRight',
      preventDefault: () => {}
    } as KeyboardEvent

    const newPos = handleKeyDown(mockEvent, groups, pos(0, 0, 0))
    expect(newPos).toEqual(pos(0, 0, 2))
  })

  it('should handle Home key', () => {
    const groups = [group([row([noDiffPoint, diffPoint, noDiffPoint])])]

    const mockEvent = {
      key: 'Home',
      preventDefault: () => {}
    } as KeyboardEvent

    const newPos = handleKeyDown(mockEvent, groups, pos(0, 0, 2))
    expect(newPos).toEqual(pos(0, 0, 1))
  })

  it('should handle End key', () => {
    const groups = [group([row([noDiffPoint, diffPoint, noDiffPoint])])]

    const mockEvent = {
      key: 'End',
      preventDefault: () => {}
    } as KeyboardEvent

    const newPos = handleKeyDown(mockEvent, groups, pos(0, 0, 0))
    expect(newPos).toEqual(pos(0, 0, 1))
  })

  it('should ignore unknown keys', () => {
    const groups = [group([row([diffPoint])])]

    const mockEvent = {
      key: 'Enter',
      preventDefault: () => {}
    } as KeyboardEvent

    const newPos = handleKeyDown(mockEvent, groups, pos(0, 0, 0))
    expect(newPos).toBeUndefined()
  })
})

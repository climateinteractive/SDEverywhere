// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { TraceGroupViewModel } from './trace-group-vm'
import type { TracePointViewModel, TraceRowViewModel } from './trace-row-vm'
import type { SquarePosition } from './trace-nav'
import {
  findFirstRedSquare,
  findLastRedSquare,
  findNextRedSquare,
  findPreviousRedSquare,
  handleKeyDown
} from './trace-nav'
import { varIdForName } from '../../_mocks/mock-vars'

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

function row(varName: string, points: TracePointViewModel[]): TraceRowViewModel {
  const datasetKey = `ModelImpl_${varIdForName(varName)}`
  const isOutputVar = varName.startsWith('Output')
  return {
    datasetKey,
    varName,
    points,
    isOutputVar
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

function keyEvent(key: string): KeyboardEvent {
  return {
    key,
    preventDefault: () => {}
  } as KeyboardEvent
}

describe('findFirstRedSquare', () => {
  it('should return the first red square', () => {
    const groups = [group([row('Impl1', [noDiffPoint, diffPoint, diffPoint])])]
    const result = findFirstRedSquare(groups)
    expect(result).toEqual(pos(0, 0, 1))
  })

  it('should return undefined when no red squares exist', () => {
    const groups = [group([row('Impl1', [noDiffPoint, noDiffPoint, noDiffPoint])])]
    const result = findFirstRedSquare(groups)
    expect(result).toBeUndefined()
  })

  it('should skip empty points', () => {
    const groups = [group([row('Impl1', [noDataPoint, diffPoint, noDiffPoint])])]
    const result = findFirstRedSquare(groups)
    expect(result).toEqual(pos(0, 0, 1))
  })
})

describe('findLastRedSquare', () => {
  it('should return the last red square', () => {
    const groups = [group([row('Impl1', [diffPoint, diffPoint, noDiffPoint])])]
    const result = findLastRedSquare(groups)
    expect(result).toEqual(pos(0, 0, 1))
  })

  it('should return undefined when no red squares exist', () => {
    const groups = [group([row('Impl1', [noDiffPoint, noDiffPoint, noDiffPoint])])]
    const result = findLastRedSquare(groups)
    expect(result).toBeUndefined()
  })
})

describe('findNextRedSquare', () => {
  it('should find next red square in same time point', () => {
    const groups = [
      group([row('Impl1', [noDiffPoint, diffPoint, noDiffPoint]), row('Impl2', [noDiffPoint, diffPoint, noDiffPoint])])
    ]
    const result = findNextRedSquare(groups, pos(0, 0, 1))
    expect(result).toEqual(pos(0, 1, 1))
  })

  it('should find next red square in next time point when none in current', () => {
    const groups = [group([row('Impl1', [noDiffPoint, noDiffPoint, diffPoint])])]
    const result = findNextRedSquare(groups, pos(0, 0, 1))
    expect(result).toEqual(pos(0, 0, 2))
  })

  it('should wrap around to first red square when at end', () => {
    const groups = [group([row('Impl1', [diffPoint, noDiffPoint, noDiffPoint])])]
    const result = findNextRedSquare(groups, pos(0, 0, 2))
    expect(result).toEqual(pos(0, 0, 0))
  })

  it('should return first red square when no current position', () => {
    const groups = [group([row('Impl1', [noDiffPoint, diffPoint, noDiffPoint])])]
    const result = findNextRedSquare(groups, undefined)
    expect(result).toEqual(pos(0, 0, 1))
  })

  it('should find next output red square when matchOutputVarsOnly is true', () => {
    const groups = [
      group([
        row('Impl1', [noDiffPoint, diffPoint, noDiffPoint]),
        row('Output1', [noDiffPoint, diffPoint, noDiffPoint])
      ])
    ]
    const result = findNextRedSquare(groups, pos(0, 0, 1), { matchOutputVarsOnly: true })
    expect(result).toEqual(pos(0, 1, 1))
  })

  it('should wrap around to first output red square when matchOutputVarsOnly is true', () => {
    const groups = [
      group([
        row('Output1', [diffPoint, noDiffPoint, noDiffPoint]),
        row('Impl1', [noDiffPoint, diffPoint, noDiffPoint])
      ])
    ]
    const result = findNextRedSquare(groups, pos(0, 1, 1), { matchOutputVarsOnly: true })
    expect(result).toEqual(pos(0, 0, 0))
  })
})

describe('findPreviousRedSquare', () => {
  it('should find previous red square in same time point', () => {
    const groups = [
      group([row('Impl1', [diffPoint, noDiffPoint, diffPoint]), row('Impl2', [noDiffPoint, noDiffPoint, diffPoint])])
    ]
    const result = findPreviousRedSquare(groups, pos(0, 1, 2))
    expect(result).toEqual(pos(0, 0, 2))
  })

  it('should find previous red square in previous time point when none in current', () => {
    const groups = [group([row('Impl1', [diffPoint, noDiffPoint, noDiffPoint])])]
    const result = findPreviousRedSquare(groups, pos(0, 0, 1))
    expect(result).toEqual(pos(0, 0, 0))
  })

  it('should wrap around to last red square when at beginning', () => {
    const groups = [group([row('Impl1', [noDiffPoint, noDiffPoint, diffPoint])])]
    const result = findPreviousRedSquare(groups, pos(0, 0, 0))
    expect(result).toEqual(pos(0, 0, 2))
  })

  it('should return last red square when no current position', () => {
    const groups = [group([row('Impl1', [noDiffPoint, diffPoint, noDiffPoint])])]
    const result = findPreviousRedSquare(groups, undefined)
    expect(result).toEqual(pos(0, 0, 1))
  })
})

describe('handleKeyDown', () => {
  it('should handle ArrowLeft key', () => {
    const groups = [group([row('Impl1', [diffPoint, noDiffPoint, diffPoint])])]
    const newPos = handleKeyDown(keyEvent('ArrowLeft'), groups, pos(0, 0, 2))
    expect(newPos).toEqual(pos(0, 0, 0))
  })

  it('should handle ArrowRight key', () => {
    const groups = [group([row('Impl1', [diffPoint, noDiffPoint, diffPoint])])]
    const newPos = handleKeyDown(keyEvent('ArrowRight'), groups, pos(0, 0, 0))
    expect(newPos).toEqual(pos(0, 0, 2))
  })

  it('should handle Home key', () => {
    const groups = [group([row('Impl1', [noDiffPoint, diffPoint, noDiffPoint])])]
    const newPos = handleKeyDown(keyEvent('Home'), groups, pos(0, 0, 2))
    expect(newPos).toEqual(pos(0, 0, 1))
  })

  it('should handle End key', () => {
    const groups = [group([row('Impl1', [noDiffPoint, diffPoint, noDiffPoint])])]
    const newPos = handleKeyDown(keyEvent('End'), groups, pos(0, 0, 0))
    expect(newPos).toEqual(pos(0, 0, 1))
  })

  it('should handle n key for output-only navigation', () => {
    const groups = [
      group([
        row('Impl1', [noDiffPoint, diffPoint, noDiffPoint]),
        row('Output1', [noDiffPoint, diffPoint, noDiffPoint])
      ])
    ]
    const newPos = handleKeyDown(keyEvent('n'), groups, pos(0, 0, 1))
    expect(newPos).toEqual(pos(0, 1, 1))
  })

  it('should ignore unknown keys', () => {
    const groups = [group([row('Impl1', [diffPoint])])]
    const newPos = handleKeyDown(keyEvent('Enter'), groups, pos(0, 0, 0))
    expect(newPos).toBeUndefined()
  })
})

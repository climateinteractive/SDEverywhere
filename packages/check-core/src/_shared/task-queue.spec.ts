// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { beforeEach, describe, expect, it } from 'vitest'

import type { Task, TaskExecutor, TaskExecutorKey } from './task-queue'
import { TaskQueue } from './task-queue'

function mockExecutor(): TaskExecutor {
  return {
    execute: async task => {
      return task.process({ L: undefined, R: undefined })
    }
  }
}

const executors: Map<TaskExecutorKey, TaskExecutor> = new Map()
executors.set('executor-0', mockExecutor())
executors.set('executor-1', mockExecutor())

describe('TaskQueue', () => {
  const results: string[] = []

  beforeEach(() => {
    results.length = 0
  })

  function mockTask(id: number, options?: { delay?: number; fail?: boolean }): Task {
    return {
      key: `t${id}`,
      kind: 'mock-task',
      process: async () => {
        if (options?.delay) {
          // Add a small delay to simulate real processing time
          await new Promise(resolve => setTimeout(resolve, options.delay))
        }
        if (options?.fail) {
          throw new Error('Fake error')
        }
        results.push(`t${id}-done`)
      }
    }
  }

  it('should run all tasks', async () => {
    const taskQueue: TaskQueue = new TaskQueue(executors)
    const idleError: Error | undefined = await new Promise(resolve => {
      taskQueue.onIdle(error => resolve(error))
      taskQueue.addTask(mockTask(1))
      taskQueue.addTask(mockTask(2))
      taskQueue.addTask(mockTask(3))
    })

    expect(idleError).toBeUndefined()
    expect(results).toEqual(['t1-done', 't2-done', 't3-done'])
  })

  it('should call onIdle and stop processing if an error is encountered', async () => {
    const taskQueue: TaskQueue = new TaskQueue(executors)
    const idleError: Error | undefined = await new Promise(resolve => {
      taskQueue.onIdle(error => resolve(error))
      taskQueue.addTask(mockTask(1))
      taskQueue.addTask(mockTask(2, { fail: true }))
      taskQueue.addTask(mockTask(3))
    })

    expect(idleError?.message).toBe('Fake error')
    expect(results).toEqual(['t1-done'])
  })

  it('should call onIdle when single task is cancelled before it is processed', async () => {
    const taskQueue: TaskQueue = new TaskQueue(executors)

    // Verify that onIdle is called when the task is cancelled before it is processed
    const idleError1: Error | undefined = await new Promise(resolve => {
      taskQueue.onIdle(error => resolve(error))
      taskQueue.addTask(mockTask(1, { delay: 1 }))
      taskQueue.cancelTask('t1')
    })
    expect(idleError1).toBeUndefined()
    expect(results).toEqual([])

    // Add another task and verify that it is processed
    results.length = 0
    const idleError2: Error | undefined = await new Promise(resolve => {
      taskQueue.onIdle(error => resolve(error))
      taskQueue.addTask(mockTask(2, { delay: 1 }))
    })
    expect(idleError2).toBeUndefined()
    expect(results).toEqual(['t2-done'])
  })

  it('should continue processing other tasks when one task is cancelled before tasks are processed', async () => {
    const taskQueue: TaskQueue = new TaskQueue(executors)

    const idleError: Error | undefined = await new Promise(resolve => {
      taskQueue.onIdle(error => resolve(error))

      // Add tasks
      taskQueue.addTask(mockTask(1, { delay: 1 }))
      taskQueue.addTask(mockTask(2, { delay: 1 }))
      taskQueue.addTask(mockTask(3, { delay: 1 }))

      // Cancel the middle task before it gets processed
      taskQueue.cancelTask('t2')

      // Add another task after cancellation
      taskQueue.addTask(mockTask(4, { delay: 1 }))
    })

    expect(idleError).toBeUndefined()
    expect(results).toEqual(['t1-done', 't3-done', 't4-done'])
  })
})

// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { TaskQueue } from './task-queue'

describe('TaskQueue', () => {
  it('should run all tasks', async () => {
    const responses: string[] = []

    const idleError = await new Promise(resolve => {
      const taskQueue: TaskQueue<string, string> = new TaskQueue({
        process: async request => {
          return request + '-done'
        }
      })
      taskQueue.onIdle = error => {
        resolve(error)
      }
      taskQueue.addTask('t1', 't1', r => responses.push(r))
      taskQueue.addTask('t2', 't2', r => responses.push(r))
      taskQueue.addTask('t3', 't3', r => responses.push(r))
    })

    expect(idleError).toBeUndefined()
    expect(responses).toEqual(['t1-done', 't2-done', 't3-done'])
  })

  it('should call onIdle and stop processing if an error is encountered', async () => {
    const responses: string[] = []

    const idleError: Error = await new Promise(resolve => {
      const taskQueue: TaskQueue<string, string> = new TaskQueue({
        process: async request => {
          if (request === 't2') {
            throw new Error('Fake error')
          } else {
            return request + '-done'
          }
        }
      })
      taskQueue.onIdle = error => {
        resolve(error)
      }
      taskQueue.addTask('t1', 't1', r => responses.push(r))
      taskQueue.addTask('t2', 't2', r => responses.push(r))
      taskQueue.addTask('t3', 't3', r => responses.push(r))
    })

    expect(idleError?.message).toBe('Fake error')
    expect(responses).toEqual(['t1-done'])
  })

  it('should call onIdle when single task is cancelled before it is processed', async () => {
    let responses: string[] = []

    const taskQueue: TaskQueue<string, string> = new TaskQueue({
      process: async request => {
        // Add a small delay to simulate real processing time
        await new Promise(resolve => setTimeout(resolve, 1))
        return request + '-done'
      }
    })

    // Verify that onIdle is called when the task is cancelled before it is processed
    const idleError1 = await new Promise(resolve => {
      taskQueue.onIdle = error => {
        resolve(error)
      }

      // Add task
      taskQueue.addTask('t1', 't1', r => responses.push(r))

      // Cancel the task before it gets processed
      taskQueue.cancelTask('t1')
    })
    expect(idleError1).toBeUndefined()
    expect(responses).toEqual([])

    // Add another task and verify that it is processed
    responses = []
    const idleError2 = await new Promise(resolve => {
      taskQueue.onIdle = error => {
        resolve(error)
      }

      // Add task
      taskQueue.addTask('t2', 't2', r => responses.push(r))
    })
    expect(idleError2).toBeUndefined()
    expect(responses).toEqual(['t2-done'])
  })

  it('should continue processing other tasks when one task is cancelled before tasks are processed', async () => {
    const responses: string[] = []

    const idleError = await new Promise(resolve => {
      const taskQueue: TaskQueue<string, string> = new TaskQueue({
        process: async request => {
          // Add a small delay to simulate real processing time
          await new Promise(resolve => setTimeout(resolve, 1))
          return request + '-done'
        }
      })
      taskQueue.onIdle = error => {
        resolve(error)
      }

      // Add tasks
      taskQueue.addTask('t1', 't1', r => responses.push(r))
      taskQueue.addTask('t2', 't2', r => responses.push(r))
      taskQueue.addTask('t3', 't3', r => responses.push(r))

      // Cancel the middle task before it gets processed
      taskQueue.cancelTask('t2')

      // Add another task after cancellation
      taskQueue.addTask('t4', 't4', r => responses.push(r))
    })

    expect(idleError).toBeUndefined()
    expect(responses).toEqual(['t1-done', 't3-done', 't4-done'])
  })
})

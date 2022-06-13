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
})

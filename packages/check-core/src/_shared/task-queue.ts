// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

export type TaskKey = string

export interface TaskProcessor<I, O> {
  process(input: I): Promise<O>
}

interface Task<I, O> {
  input: I
  onComplete: (output: O) => void
}

export class TaskQueue<I, O> {
  /** The queue of task keys, most recent at front. */
  private readonly taskKeyQueue: TaskKey[] = []

  /** The map of tasks. */
  private readonly taskMap: Map<TaskKey, Task<I, O>> = new Map()

  /** Whether tasks are being processed. */
  private processing = false

  /** Whether `shutdown` has been called. */
  private stopped = false

  public onIdle?: (error?: Error) => void

  constructor(private readonly processor: TaskProcessor<I, O>) {}

  addTask(key: TaskKey, input: I, onComplete: (output: O) => void): void {
    if (this.stopped) {
      return
    }

    if (this.taskMap.has(key)) {
      throw new Error(`Task already added for key ${key}`)
    }

    // Add the latest request at the end of the queue
    this.taskKeyQueue.push(key)
    this.taskMap.set(key, {
      input,
      onComplete
    })

    // Start the process if it's not already in motion
    this.processTasksIfNeeded()
  }

  cancelTask(taskKey: TaskKey): void {
    const index = this.taskKeyQueue.indexOf(taskKey)
    if (index >= 0) {
      this.taskKeyQueue.splice(index, 1)
    }
    this.taskMap.delete(taskKey)
  }

  shutdown(): void {
    this.stopped = true
    this.processing = false
    this.taskKeyQueue.length = 0
    this.taskMap.clear()
  }

  private processTasksIfNeeded(): void {
    if (!this.stopped && !this.processing) {
      // No tasks are already in being processed, so schedule them now
      this.processing = true

      // Process the next task asynchronously
      setTimeout(() => {
        this.processNextTask()
      })
    }
  }

  private async processNextTask(): Promise<void> {
    // Pop the latest request off the front of the queue
    const taskKey = this.taskKeyQueue.shift()
    if (!taskKey) {
      return
    }
    const task = this.taskMap.get(taskKey)
    if (task) {
      this.taskMap.delete(taskKey)
    } else {
      return
    }

    // Run the task asynchronously
    let output: O
    try {
      output = await this.processor.process(task.input)
    } catch (e) {
      if (!this.stopped) {
        // TODO: For now, if we encounter an error, stop processing tasks
        // and notify the onIdle callback with the error.  Maybe we should
        // change this to continue processing other tasks.
        this.shutdown()
        this.onIdle?.(e)
      }
      return
    }

    // Notify the callback
    task.onComplete(output)

    // See if another run is needed
    if (this.taskKeyQueue.length > 0) {
      // Keep `processing` set and process the next task
      setTimeout(() => {
        this.processNextTask()
      })
    } else {
      // No more tasks, so clear the flag
      this.processing = false
      if (!this.stopped) {
        this.onIdle?.()
      }
    }
  }
}

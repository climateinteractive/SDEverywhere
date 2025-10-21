// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { BundleModel } from '../bundle/bundle-types'

export type TaskKey = string
export type TaskExecutorKey = string

export interface BundleModels {
  L?: BundleModel
  R: BundleModel
}

/**
 * Base interface for all tasks in the unified system.
 */
export interface Task {
  /** Unique key for this task instance. */
  key: TaskKey
  /** The task kind. */
  kind: string
  /** Process the task using the given models. */
  process(models: BundleModels): Promise<void>
}

/**
 * Executes a single task using a set of `BundleModel` instances.
 */
export interface TaskExecutor {
  /**
   * Execute the given task using the set of `BundleModel` instances
   * associated with this executor.
   *
   * @param task The task to execute.
   * @return A promise that resolves when the task is complete.
   */
  execute(task: Task): Promise<void>
}

/**
 * A unified task queue that can process multiple kinds of tasks concurrently
 * while ensuring that BundleModel instances are never accessed concurrently.
 * This replaces the need for multiple separate TaskQueue instances.
 */
export class TaskQueue {
  /** The single instance. */
  private static instance: TaskQueue | undefined

  /** The queue of task keys, most recent at front. */
  private readonly taskKeyQueue: TaskKey[] = []

  /** The map of tasks. */
  private readonly taskMap: Map<TaskKey, Task> = new Map()

  // /** The set of keys for the executors that are currently processing tasks. */
  // private readonly activeExecutorKeys: Set<TaskExecutorKey> = new Set()

  /** The idle event listeners. */
  private readonly idleListeners: ((error?: Error) => void)[] = []

  /** Whether tasks are being processed. */
  private processing = false

  /** Whether `shutdown` has been called. */
  private stopped = false

  /**
   * @param executors The map of available task executors.
   */
  constructor(private readonly executors: Map<TaskExecutorKey, TaskExecutor>) {}

  /**
   * Initialize the shared `TaskQueue` instance.
   *
   * @param executors The map of available task executors.
   */
  static initialize(executors: Map<TaskExecutorKey, TaskExecutor>): void {
    console.log('TaskQueue.initialize', executors.size)
    if (executors.size === 0) {
      throw new Error('Must provide at least one executor')
    }
    this.instance = new TaskQueue(executors)
  }

  /**
   * Get the shared `TaskQueue` instance.
   */
  static getInstance(): TaskQueue {
    if (!this.instance) {
      throw new Error('TaskQueue not initialized; must call `initialize` first')
    }
    return this.instance
  }

  /**
   * Add a task to the queue.
   *
   * @param task The task to add.
   */
  addTask(task: Task): void {
    if (this.stopped) {
      return
    }

    if (this.taskMap.has(task.key)) {
      throw new Error(`Task already added for key ${task.key}`)
    }

    // Add the latest request at the end of the queue
    this.taskKeyQueue.push(task.key)
    this.taskMap.set(task.key, task)

    // Start processing tasks if needed
    this.processTasksIfNeeded()
  }

  /**
   * Cancel a task.
   *
   * @param taskKey The key of the task to cancel.
   */
  cancelTask(taskKey: TaskKey): void {
    const index = this.taskKeyQueue.indexOf(taskKey)
    if (index >= 0) {
      this.taskKeyQueue.splice(index, 1)
    }
    this.taskMap.delete(taskKey)
  }

  /**
   * Add an idle listener.
   *
   * @param listener The listener to add.
   */
  onIdle(listener: (error?: Error) => void): void {
    this.idleListeners.push(listener)
  }

  /**
   * Remove an idle listener.
   *
   * @param listener The listener to remove.
   */
  removeIdleListener(listener: (error?: Error) => void): void {
    this.idleListeners.splice(this.idleListeners.indexOf(listener), 1)
  }

  /**
   * Notify the idle listeners.
   *
   * @param error The error to notify the listeners with.
   */
  private notifyIdle(error?: Error): void {
    for (const listener of this.idleListeners) {
      listener(error)
    }
  }

  /**
   * Shutdown the task queue, cancelling all pending tasks.
   */
  shutdown(): void {
    this.stopped = true
    this.taskKeyQueue.length = 0
    this.taskMap.clear()
    // this.activeExecutorKeys.clear()
  }

  private processTasksIfNeeded(): void {
    if (!this.stopped && !this.processing) {
      // No tasks are already being processed, so schedule them now
      this.processing = true

      // Process the next batch of tasks asynchronously
      setTimeout(() => {
        this.processNextTasks()
      })
    }
  }

  private async processNextTasks(): Promise<void> {
    // Pop up to `maxConcurrentTasks` tasks off the front of the queue
    // TODO: This is a simple approach for now, but we might leave some executors idle if
    // if we only get a couple tasks on each tick.  We should instead pop as many tasks off
    // the front of the queue as we have available executors.
    const taskKeys = this.taskKeyQueue.splice(0, this.executors.size)
    if (taskKeys.length === 0) {
      // All tasks were cancelled before being processed, so clear the processing flag
      this.processing = false
      if (!this.stopped) {
        this.notifyIdle()
      }
      return
    }

    // Pair the tasks with their executors
    const executeCalls: Promise<void>[] = []
    const availableExecutorKeys = Array.from(this.executors.keys())
    // const usedExecutorKeys: TaskExecutorKey[] = []
    for (const taskKey of taskKeys) {
      // Get the task for the key
      const task = this.taskMap.get(taskKey)
      if (!task) {
        continue
      }

      // Remove the task from the map
      this.taskMap.delete(taskKey)

      // Prepare the `execute` call
      const executorKey = availableExecutorKeys.shift()
      const executor = this.executors.get(executorKey)
      if (!executor) {
        throw new Error(`No executor found for key ${executorKey}`)
      }
      // usedExecutorKeys.push(executorKey)
      executeCalls.push(executor.execute(task))
    }

    // Run the tasks in parallel
    try {
      await Promise.all(executeCalls)
    } catch (e) {
      if (!this.stopped) {
        // TODO: For now, if we encounter an error, stop processing tasks
        // and notify the onIdle callback with the error.  Maybe we should
        // change this to continue processing other tasks.
        this.shutdown()
        this.notifyIdle(e)
      }
      return
    }

    // // Add the used executor keys back to the available executor keys
    // availableExecutorKeys.push(...usedExecutorKeys)

    // See if another run is needed
    if (this.taskKeyQueue.length > 0) {
      // Keep `processing` set and process the next tasks
      setTimeout(() => {
        this.processNextTasks()
      })
    } else {
      // No more tasks, so clear the flag
      this.processing = false
      if (!this.stopped) {
        this.notifyIdle()
      }
    }
  }
}

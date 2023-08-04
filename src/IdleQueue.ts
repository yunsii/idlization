import { now } from './helpers/now'
import { cIC, rIC } from './idle-callback-polyfill'
import { queueMicrotask } from './helpers/queueMicrotask'

const DEFAULT_MIN_TASK_TIME = 0

const isSafari_ = !!(
  'safari' in window &&
  typeof window.safari === 'object' &&
  'pushNotification' in (window.safari as any)
)

/**
 * Returns true if the IdleDeadline object exists and the remaining time is
 * less or equal to than the minTaskTime. Otherwise returns false.
 */
const shouldYield = (deadline?: IdleDeadline, minTaskTime?: number) => {
  if (deadline && deadline.timeRemaining() <= (minTaskTime || 0)) {
    return true
  }
  return false
}

interface State {
  time: number
  visibilityState: DocumentVisibilityState
}
type Task = (state: State) => void

/**
 * A class wraps a queue of requestIdleCallback functions for two reasons:
 *   1. So other callers can know whether or not the queue is empty.
 *   2. So we can provide some guarantees that the queued functions will
 *      run in unload-type situations.
 */
export class IdleQueue {
  private idleCallbackHandle_: number | null
  private taskQueue_: { state: State; task: Task; minTaskTime: number }[]
  private isProcessing_ = false

  private state_: State | null
  private defaultMinTaskTime_: number
  private ensureTasksRun_: boolean

  /**
   * Creates the IdleQueue instance and adds lifecycle event listeners to
   * run the queue if the page is hidden (with fallback behavior for Safari).
   */
  constructor({
    ensureTasksRun = false,
    defaultMinTaskTime = DEFAULT_MIN_TASK_TIME,
  } = {}) {
    this.idleCallbackHandle_ = null
    this.taskQueue_ = []
    this.state_ = null
    this.defaultMinTaskTime_ = defaultMinTaskTime
    this.ensureTasksRun_ = ensureTasksRun

    // Bind methods
    this.runTasksImmediately = this.runTasksImmediately.bind(this)
    this.runTasks_ = this.runTasks_.bind(this)
    this.onVisibilityChange_ = this.onVisibilityChange_.bind(this)

    if (this.ensureTasksRun_) {
      addEventListener('visibilitychange', this.onVisibilityChange_, true)

      // Safari does not reliably fire the `pagehide` or `visibilitychange`
      // events when closing a tab, so we have to use `beforeunload` with a
      // timeout to check whether the default action was prevented.
      // - https://bugs.webkit.org/show_bug.cgi?id=151610
      // - https://bugs.webkit.org/show_bug.cgi?id=151234
      // NOTE: we only add this to Safari because adding it to Firefox would
      // prevent the page from being eligible for bfcache.
      if (isSafari_) {
        addEventListener('beforeunload', this.runTasksImmediately, true)
      }
    }
  }

  pushTask(task: Task) {
    this.addTask_(Array.prototype.push, task)
  }

  unshiftTask(task: Task) {
    this.addTask_(Array.prototype.unshift, task)
  }

  /**
   * Runs all scheduled tasks synchronously.
   */
  runTasksImmediately() {
    // By not passing a deadline, all tasks will be run sync.
    this.runTasks_()
  }

  hasPendingTasks() {
    return this.taskQueue_.length > 0
  }

  /**
   * Clears all pending tasks for the queue and stops any scheduled tasks
   * from running.
   */
  clearPendingTasks() {
    this.taskQueue_ = []
    this.cancelScheduledRun_()
  }

  /**
   * Returns the state object for the currently running task. If no task is
   * running, null is returned.
   */
  getState() {
    return this.state_
  }

  /**
   * Destroys the instance by un-registering all added event listeners and
   * removing any overridden methods.
   */
  destroy() {
    this.taskQueue_ = []
    this.cancelScheduledRun_()

    if (this.ensureTasksRun_) {
      removeEventListener('visibilitychange', this.onVisibilityChange_, true)

      // Safari does not reliably fire the `pagehide` or `visibilitychange`
      // events when closing a tab, so we have to use `beforeunload` with a
      // timeout to check whether the default action was prevented.
      // - https://bugs.webkit.org/show_bug.cgi?id=151610
      // - https://bugs.webkit.org/show_bug.cgi?id=151234
      // NOTE: we only add this to Safari because adding it to Firefox would
      // prevent the page from being eligible for bfcache.
      if (isSafari_) {
        removeEventListener('beforeunload', this.runTasksImmediately, true)
      }
    }
  }

  private addTask_(
    arrayMethod: Array<any>['push'] | Array<any>['unshift'],
    task: Task,
    { minTaskTime = this.defaultMinTaskTime_ } = {},
  ) {
    const state: State = {
      time: now(),
      visibilityState: document.visibilityState,
    }

    arrayMethod.call(this.taskQueue_, { state, task, minTaskTime })

    this.scheduleTasksToRun_()
  }

  /**
   * Schedules the task queue to be processed. If the document is in the
   * hidden state, they queue is scheduled as a microtask so it can be run
   * in cases where a macrotask couldn't (like if the page is unloading). If
   * the document is in the visible state, `requestIdleCallback` is used.
   */
  private scheduleTasksToRun_() {
    if (this.ensureTasksRun_ && document.visibilityState === 'hidden') {
      queueMicrotask(this.runTasks_)
    } else {
      if (!this.idleCallbackHandle_) {
        this.idleCallbackHandle_ = rIC(this.runTasks_)
      }
    }
  }

  /**
   * Runs as many tasks in the queue as it can before reaching the
   * deadline. If no deadline is passed, it will run all tasks.
   * If an `IdleDeadline` object is passed (as is with `requestIdleCallback`)
   * then the tasks are run until there's no time remaining, at which point
   * we yield to input or other script and wait until the next idle time.
   */
  private runTasks_(deadline?: IdleDeadline) {
    this.cancelScheduledRun_()

    if (!this.isProcessing_) {
      this.isProcessing_ = true

      // Process tasks until there's no time left or we need to yield to input.
      while (
        this.hasPendingTasks() &&
        !shouldYield(deadline, this.taskQueue_[0].minTaskTime)
      ) {
        const taskQueueItem = this.taskQueue_.shift()
        if (taskQueueItem) {
          const { task, state } = taskQueueItem

          this.state_ = state
          task(state)
          this.state_ = null
        }
      }

      this.isProcessing_ = false

      if (this.hasPendingTasks()) {
        // Schedule the rest of the tasks for the next idle time.
        this.scheduleTasksToRun_()
      }
    }
  }

  /**
   * Cancels any scheduled idle callback and removes the handler (if set).
   */
  private cancelScheduledRun_() {
    if (this.idleCallbackHandle_) {
      cIC(this.idleCallbackHandle_)
    }
    this.idleCallbackHandle_ = null
  }

  /**
   * A callback for the `visibilitychange` event that runs all pending
   * callbacks immediately if the document's visibility state is hidden.
   */
  private onVisibilityChange_() {
    if (document.visibilityState === 'hidden') {
      this.runTasksImmediately()
    }
  }
}

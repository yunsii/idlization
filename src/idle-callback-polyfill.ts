import { now } from './helpers/now'

const supportsRequestIdleCallback_ = typeof requestIdleCallback === 'function'

/**
 * A minimal shim of the native IdleDeadline class.
 */
class IdleDeadline {
  initTime_: number

  constructor(initTime: number) {
    this.initTime_ = initTime
  }

  get didTimeout() {
    return false
  }

  timeRemaining() {
    return Math.max(0, 50 - (now() - this.initTime_))
  }
}

/**
 * A minimal shim for the requestIdleCallback function. This accepts a
 * callback function and runs it at the next idle period, passing in an
 * object with a `timeRemaining()` method.
 */
const requestIdleCallbackShim = (
  callback: (deadline: IdleDeadline) => void,
) => {
  const deadline = new IdleDeadline(now())
  return setTimeout(() => callback(deadline), 0)
}

/**
 * A minimal shim for the  cancelIdleCallback function. This accepts a
 * handle identifying the idle callback to cancel.
 */
const cancelIdleCallbackShim = (handle: number | null) => {
  if (handle) {
    clearTimeout(handle)
  }
}

/**
 * The native `requestIdleCallback()` function or `cancelIdleCallbackShim()`
 *.if the browser doesn't support it.
 */
export const rIC = supportsRequestIdleCallback_
  ? requestIdleCallback
  : requestIdleCallbackShim

/**
 * The native `cancelIdleCallback()` function or `cancelIdleCallbackShim()`
 * if the browser doesn't support it.
 */
export const cIC = supportsRequestIdleCallback_
  ? cancelIdleCallback
  : cancelIdleCallbackShim

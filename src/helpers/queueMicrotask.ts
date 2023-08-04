import { isBrowser } from './env'

export type Microtask = () => void

const createQueueMicrotaskViaPromises = () => {
  return (microtask: Microtask) => {
    Promise.resolve().then(microtask)
  }
}

const createQueueMicrotaskViaMutationObserver = () => {
  let i = 0
  let microtaskQueue: Microtask[] = []
  const observer = new MutationObserver(() => {
    microtaskQueue.forEach((microtask) => microtask())
    microtaskQueue = []
  })
  const node = document.createTextNode('')
  observer.observe(node, { characterData: true })

  return (microtask: Microtask) => {
    microtaskQueue.push(microtask)

    // Trigger a mutation observer callback, which is a microtask.
    node.data = String(++i % 2)
  }
}

/**
 * Queues a function to be run in the next microtask. If the browser supports
 * Promises, those are used. Otherwise it falls back to MutationObserver.
 * Note: since Promise polyfills are popular but not all support microtasks,
 * we check for native implementation rather than a polyfill.
 */
export const createQueueMicrotask = () => {
  return isBrowser && 'queueMicrotask' in window
    ? window.queueMicrotask
    : typeof Promise === 'function' &&
      Promise.toString().includes('[native code]')
    ? createQueueMicrotaskViaPromises()
    : createQueueMicrotaskViaMutationObserver()
}

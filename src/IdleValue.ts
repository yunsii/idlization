import { cIC, rIC } from './idle-callback-polyfill'

/**
 * A class that wraps a value that is initialized when idle.
 */
export class IdleValue<F extends () => any> {
  init_: F
  value_?: ReturnType<F>
  idleHandle_: number | null
  initialized = false

  /**
   * Accepts a function to initialize the value of a variable when idle.
   */
  constructor(init: F) {
    this.init_ = init

    this.idleHandle_ = rIC(async () => {
      this.value_ = this.init_()
      this.initialized = true
    })
  }

  /**
   * Returns the value if it's already been initialized. If it hasn't then the
   * initializer function is run immediately and the pending idle callback
   * is cancelled.
   */
  getValue(): ReturnType<F> extends undefined
    ? ReturnType<F>
    : Exclude<ReturnType<F>, undefined> {
    if (!this.initialized) {
      this.cancelIdleInit_()
      this.value_ = this.init_()
    }
    return this.value_!
  }

  setValue(newValue: ReturnType<F>) {
    this.cancelIdleInit_()
    this.value_ = newValue
    this.initialized = true
  }

  /**
   * Cancels any scheduled requestIdleCallback and resets the handle.
   */
  cancelIdleInit_() {
    if (this.idleHandle_) {
      cIC(this.idleHandle_)
      this.idleHandle_ = null
    }
  }
}

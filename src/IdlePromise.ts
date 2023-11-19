import { cIC, rIC } from './idle-callback-polyfill'

/**
 * Browser only
 *
 * ref: https://til.florianpellet.com/2020/02/29/Generator-idle-promise/
 */
export class IdlePromise<T = unknown> {
  static padding = 1 // if `yield` doesn't give any information about timing, assume 1ms
  private duration = 0

  resolve: (value: T | PromiseLike<T>) => void = null!
  reject: (reason?: any) => void = null!
  idleCallbackId: number = null!

  promise = new Promise<T>((resolve, reject) => {
    this.resolve = resolve
    this.reject = reject
  })

  then: typeof this.promise.then
  catch: typeof this.promise.catch
  finally: typeof this.promise.finally

  iterator: Generator<number | void, void, void>
  done?: boolean

  // this constructor can be used exactly like `new Promise()`,
  // the generator will receive `resolve` and `reject`
  constructor(
    generator: (
      gResolve: (value: T | PromiseLike<T>) => void,
      gReject: (reason?: any) => void,
    ) => Generator<void | number, void, void>,
  ) {
    this.then = this.promise.then.bind(this.promise)
    this.catch = this.promise.catch.bind(this.promise)
    this.finally = this.promise.finally.bind(this.promise)

    this.iterator = generator(this.resolve, this.reject)
    this.run()
  }

  // executing one chunk
  async step() {
    const { value, done } = await this.iterator.next()
    this.done = done
    if (!done) {
      this.duration = value || IdlePromise.padding
    }
  }

  // loop asynchronously, with `requestIdleCallback`
  run() {
    this.idleCallbackId = rIC(async (idleDeadline) => {
      while (!this.done && this.duration < idleDeadline.timeRemaining()) {
        await this.step()
      }
      if (!this.done) {
        this.run()
      }
    })
  }

  // cancel current `requestIdleCallback` and run immediately
  async finish() {
    if (this.idleCallbackId) {
      cIC(this.idleCallbackId)
    }
    while (!this.done) {
      await this.step()
    }
    return this.promise
  }
}

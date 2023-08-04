import { IdleValue } from './IdleValue'

export function defineIdleProperty<F extends () => any>(
  obj: any,
  prop: PropertyKey,
  init: F,
) {
  const idleValue = new IdleValue<F>(init)

  Object.defineProperty(obj, prop, {
    configurable: true,
    get: idleValue.getValue.bind(idleValue),
    set: idleValue.setValue.bind(idleValue),
  })
}

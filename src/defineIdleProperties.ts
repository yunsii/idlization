import { defineIdleProperty } from './defineIdleProperty'

export function defineIdleProperties(
  obj: any,
  props: Record<string, () => any>,
) {
  Object.keys(props).forEach((prop) => {
    defineIdleProperty(obj, prop, props[prop])
  })
}

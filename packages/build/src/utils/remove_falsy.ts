// Remove falsy values from object
export const removeFalsy = function <T extends Record<PropertyKey, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(isDefined)) as Partial<T>
}

const isDefined = function ([_key, value]: [PropertyKey, unknown]): boolean {
  return value !== undefined && value !== ''
}

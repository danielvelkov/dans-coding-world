export function filterObject<T extends Record<string, any>>(
  obj: T,
  allowedProps: string[]
) {
  return Object.fromEntries(allowedProps.map((key) => [key, obj[key]])) as T;
}

export function getKey<T>(key: keyof T): keyof T {
  return key;
}

export function filterObject<T extends Record<string, any>>(
  obj: T,
  allowedProps: string[],
) {
  return Object.fromEntries(allowedProps.map((key) => [key, obj[key]])) as T;
}

export function getKey<T>(key: keyof T): keyof T {
  return key;
}

export function deepMerge<T>(target: T, source: Partial<T>): T {
  for (const key in source) {
    const value = source[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      target[key] = deepMerge(target[key], value);
    } else {
      target[key] = value as any;
    }
  }
  return target;
}

export const sortObjectsByStringProp =
  <T>(key: keyof T, order: 'desc' | 'asc' = 'asc') =>
  (a: T, b: T) => {
    const av = String(a[key] ?? '');
    const bv = String(b[key] ?? '');

    const result = av < bv ? -1 : av > bv ? 1 : 0;

    return order === 'asc' ? result : -result;
  };

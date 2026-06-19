export function debounceCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay = 1000,
) {
  let timeout: NodeJS.Timeout;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      callback.apply(this, args);
    }, delay);
  };
}

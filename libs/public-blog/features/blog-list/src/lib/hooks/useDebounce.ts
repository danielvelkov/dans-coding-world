import { useCallback, useRef, useEffect, useState } from 'react';

function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay = 1000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPending, setIsPending] = useState(false);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsPending(true);
      timeoutRef.current = setTimeout(() => {
        callback(...args);
        setIsPending(false);
      }, delay);
    },
    [callback, delay]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { debounceCb: debouncedCallback, isPending };
}

export default useDebounce;

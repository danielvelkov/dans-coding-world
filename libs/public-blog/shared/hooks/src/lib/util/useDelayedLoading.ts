import { useEffect, useState } from 'react';

/**
 * Hook for delayed set of a flag for loading.
 * Instead of immediately showing loading shimmer, you can use this hook to
 * show them only when a certain delay has passed.
 */
export function useDelayedLoading(isLoading: boolean, delayInMs = 1000) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShow(false);
      return;
    }

    const timer = setTimeout(() => {
      setShow(true);
    }, delayInMs);

    return () => clearTimeout(timer);
  }, [isLoading, delayInMs]);

  return show;
}

'use client';

import { useState, useCallback } from 'react';

export function useAsyncSubmit<TArgs extends unknown[], R = unknown>(
  fn: (...args: TArgs) => Promise<R>,
  onSuccess?: (data: R) => void,
  onError?: (err: unknown) => void
) {
  const [loading, setLoading] = useState(false);

  const submit = useCallback(
    async (...args: TArgs) => {
      if (loading) return;
      setLoading(true);
      try {
        const data = await fn(...args);
        onSuccess?.(data);
      } catch (err) {
        onError?.(err);
      } finally {
        setLoading(false);
      }
    },
    [fn, loading, onSuccess, onError]
  );

  return { submit, loading };
}
import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { toApiError, type ApiError } from '@/services/http/apiClient';

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: ApiError | null;
  /** Re-run the loader. `silent` keeps current data visible (no skeleton). */
  reload: (opts?: { silent?: boolean }) => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
}

/**
 * Minimal data-loading hook for service calls. Ignores stale responses when deps change.
 * Candidate for replacement by TanStack Query if caching/invalidation becomes necessary.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const callId = useRef(0);
  const loaderRef = useRef(loader);
  // Declared before the run effect so the latest loader is used on each deps change.
  useEffect(() => {
    loaderRef.current = loader;
  });

  const run = useCallback(async (opts: { silent?: boolean } = {}) => {
    const id = ++callId.current;
    if (!opts.silent) setLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      if (id === callId.current) setData(result);
    } catch (err) {
      if (id === callId.current) setError(toApiError(err));
    } finally {
      if (id === callId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload: run, setData };
}

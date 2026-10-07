import type { ReactNode } from 'react';
import type { AsyncState } from '@/hooks/useAsync';
import { ErrorState, SkeletonRows } from '../ui';

interface AsyncBoundaryProps<T> {
  state: AsyncState<T>;
  children: (data: T) => ReactNode;
  /** Shown while loading for the first time. */
  skeleton?: ReactNode;
  /** Rendered instead of children when `isEmpty(data)` is true. */
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
}

/** Standard loading → error → empty → content rendering for service data. */
export function AsyncBoundary<T>({ state, children, skeleton, empty, isEmpty }: AsyncBoundaryProps<T>) {
  if (state.error) return <ErrorState message={state.error.message} onRetry={() => void state.reload()} />;
  if (state.data === undefined) return <>{skeleton ?? <SkeletonRows />}</>;
  if (empty && isEmpty?.(state.data)) return <>{empty}</>;
  return <>{children(state.data)}</>;
}

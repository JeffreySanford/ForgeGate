import { catchError, of, type Observable } from 'rxjs';

/**
 * Wraps a source stream so that one failing adapter cannot break the shared
 * evidence bus for every other component, per documentation/22-reactive-data-flow.md
 * ("Error handling in streams"). The failure is reported through
 * `onError`, but the stream itself keeps emitting the fallback value
 * instead of terminating.
 */
export function isolate<T>(
  source$: Observable<T>,
  fallback: T,
  onError?: (error: unknown) => void,
): Observable<T> {
  return source$.pipe(
    catchError((error: unknown) => {
      onError?.(error);
      return of(fallback);
    }),
  );
}

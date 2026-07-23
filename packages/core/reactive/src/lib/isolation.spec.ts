import { TestScheduler } from 'rxjs/testing';
import { isolate } from './isolation';

describe('isolate (marble)', () => {
  it('replaces an error with the fallback value instead of terminating the stream', () => {
    const scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

    scheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('a-#', { a: 1 }, new Error('adapter exploded'));

      expectObservable(isolate(source$, -1)).toBe('a-(f|)', { a: 1, f: -1 });
    });
  });

  it('reports the error without throwing', () => {
    let reported: unknown;
    const scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

    scheduler.run(({ cold, expectObservable }) => {
      const boom = new Error('adapter exploded');
      const source$ = cold('#', {}, boom);

      expectObservable(isolate(source$, 'fallback', (error) => (reported = error))).toBe('(f|)', {
        f: 'fallback',
      });
    });

    expect(reported).toBeInstanceOf(Error);
  });
});

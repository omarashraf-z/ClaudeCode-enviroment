/** Guards against a request that never settles at all (a stalled connection,
 *  not just a fast failure) — without this, a loading flag could stay true
 *  forever instead of falling back gracefully. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

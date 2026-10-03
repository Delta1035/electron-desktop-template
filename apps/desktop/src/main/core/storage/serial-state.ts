import type { JsonStore } from './json-store'

/** Serialize read-modify-write operations, and publish only after durable writes. */
export function createSerialState<T>(store: JsonStore<T>): {
  read(): Promise<T>
  update<R>(change: (value: T) => { value: T; result: R }): Promise<R>
  flush(): Promise<void>
} {
  let tail: Promise<unknown> = Promise.resolve()
  const enqueue = <R>(run: () => Promise<R>): Promise<R> => {
    const next = tail.then(run)
    tail = next.catch(() => undefined)
    return next
  }
  return {
    read: () => enqueue(() => store.read()),
    update: (change) =>
      enqueue(async () => {
        const next = change(await store.read())
        await store.write(next.value)
        return next.result
      }),
    flush: async () => {
      await tail
    }
  }
}

import type { AppEvent, AppEvents } from '@desktop/shared'

export interface EventBus extends AppEvents {
  emit(event: AppEvent): void
}

/** Fans core events out to every transport (IPC today, WebSocket later). */
export function createEventBus(onListenerError: (error: unknown) => void): EventBus {
  const listeners = new Set<(event: AppEvent) => void>()
  return {
    emit(event) {
      for (const listener of listeners) {
        try {
          listener(event)
        } catch (error) {
          // One broken transport must not stop events reaching the others.
          onListenerError(error)
        }
      }
    },
    subscribe(listener) {
      // Wrapped so subscribing the same function twice yields two independent subscriptions.
      const entry = (event: AppEvent): void => listener(event)
      listeners.add(entry)
      return () => {
        listeners.delete(entry)
      }
    }
  }
}

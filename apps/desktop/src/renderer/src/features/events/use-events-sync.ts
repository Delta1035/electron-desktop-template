import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { events } from '@renderer/api'
export function useEventsSync(): void {
  const client = useQueryClient()
  useEffect(
    () =>
      events.subscribe((event) => {
        if (event.type === 'notes-updated') client.setQueryData(['notes'], event.notes)
        if (event.type === 'settings-updated') client.setQueryData(['settings'], event.settings)
      }),
    [client]
  )
}

import { useState } from 'react'
import { TitleBar } from '@renderer/features/title-bar/title-bar'
import { SettingsPage } from '@renderer/features/settings/settings-page'
import { NotesPage } from '@renderer/features/notes/notes-page'
import { useEventsSync } from '@renderer/features/events/use-events-sync'
function App(): React.JSX.Element {
  useEventsSync()
  const [showSettings, setShowSettings] = useState(false)
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TitleBar
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings(!showSettings)}
      />
      <main className="min-h-0 flex-1 overflow-auto">
        {showSettings ? <SettingsPage onClose={() => setShowSettings(false)} /> : <NotesPage />}
      </main>
    </div>
  )
}
export default App

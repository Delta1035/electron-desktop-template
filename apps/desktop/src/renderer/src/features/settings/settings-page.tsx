import { useSyncExternalStore, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@renderer/api'
import { appearance, type ThemePreference } from '@renderer/lib/appearance'
import { Button } from '@renderer/components/ui/button'
import { Segmented, SettingRow, SettingsSection } from './settings-controls'
import { UpdatesSection } from './updates-section'
export function SettingsPage({ onClose }: { onClose: () => void }): React.JSX.Element {
  const theme = useSyncExternalStore(appearance.subscribe, appearance.preference)
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.getSettings() })
  const client = useQueryClient()
  const [error, setError] = useState('')
  const save = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: (value) => {
      client.setQueryData(['settings'], value)
      setError('')
    },
    onError: (reason) => setError(reason.message)
  })
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">设置</h2>
        <Button variant="outline" onClick={onClose}>
          返回便签
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
      {settings.error && <p role="alert">{settings.error.message}</p>}
      <SettingsSection title="外观">
        <SettingRow label="主题">
          <Segmented<ThemePreference>
            label="主题"
            value={theme}
            options={[
              { value: 'system', label: '跟随系统' },
              { value: 'light', label: '浅色' },
              { value: 'dark', label: '深色' }
            ]}
            onChange={appearance.setPreference}
          />
        </SettingRow>
      </SettingsSection>
      <SettingsSection title="窗口">
        <SettingRow label="关闭窗口时" htmlFor="close-action">
          <select
            id="close-action"
            disabled={!settings.data || save.isPending}
            value={settings.data?.closeAction ?? 'tray'}
            onChange={(event) =>
              save.mutate({ closeAction: event.target.value as 'tray' | 'quit' })
            }
            className="rounded border bg-background p-2 text-sm"
          >
            <option value="tray">隐藏到托盘</option>
            <option value="quit">退出应用</option>
          </select>
        </SettingRow>
      </SettingsSection>
      <UpdatesSection />
    </div>
  )
}

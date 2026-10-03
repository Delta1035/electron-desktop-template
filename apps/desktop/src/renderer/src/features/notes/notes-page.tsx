import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@renderer/api'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
export function NotesPage(): React.JSX.Element {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const notes = useQuery({ queryKey: ['notes'], queryFn: () => api.listNotes() })
  const add = useMutation({
    mutationFn: api.addNote,
    onSuccess: () => {
      setText('')
      setError('')
      void notes.refetch()
    },
    onError: (reason) => setError(reason.message)
  })
  const remove = useMutation({
    mutationFn: api.removeNote,
    onSuccess: () => {
      setError('')
      void notes.refetch()
    },
    onError: (reason) => setError(reason.message)
  })
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h2 className="text-2xl font-semibold">便签</h2>
        <p className="mt-2 text-sm text-muted-foreground">记录一个想法，关闭后也会保留。</p>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          add.mutate(text)
        }}
      >
        <Input
          aria-label="便签内容"
          placeholder="写点什么…"
          value={text}
          maxLength={2000}
          onChange={(event) => setText(event.target.value)}
        />
        <Button type="submit" disabled={add.isPending || !text.trim()}>
          添加
        </Button>
      </form>
      {(error || notes.error) && <p role="alert">{error || notes.error?.message}</p>}
      {notes.isPending ? (
        <p role="status">加载中…</p>
      ) : notes.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">还没有便签</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.data?.map((note) => (
            <li
              key={note.id}
              className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4"
            >
              <p className="min-w-0 whitespace-pre-wrap break-words">{note.text}</p>
              <Button
                variant="outline"
                size="sm"
                disabled={remove.isPending}
                aria-label={`删除 ${note.text}`}
                onClick={() => remove.mutate(note.id)}
              >
                删除
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

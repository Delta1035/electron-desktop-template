import { mkdtemp, rm, readFile, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppCore } from './app-core'
import { createNoteService } from './notes/note-service'
describe('desktop core', () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'desktop-core-'))
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })
  const make = () =>
    createAppCore({ dataDir: dir, version: '0.0.0', platform: 'test', productName: 'Test' })
  it('serializes concurrent writes, persists across sessions and publishes committed state', async () => {
    const core = make()
    const listener = vi.fn()
    core.subscribe(listener)
    const created = await Promise.all(
      Array.from({ length: 10 }, (_, i) => core.addNote(`note ${i}`))
    )
    expect(await core.listNotes()).toHaveLength(10)
    await core.removeNote(created[0]!.id)
    await core.updateSettings({ closeAction: 'quit' })
    expect(await core.updateSettings({})).toEqual({ closeAction: 'quit' })
    await core.dispose()
    const restarted = make()
    expect(await restarted.listNotes()).toHaveLength(9)
    expect(await restarted.getSettings()).toEqual({ closeAction: 'quit' })
    expect(JSON.parse(await readFile(join(dir, 'notes.json'), 'utf8'))).toHaveLength(9)
    expect(listener).toHaveBeenCalledWith({
      type: 'settings-updated',
      settings: { closeAction: 'quit' }
    })
  })
  it('rejects malformed inputs without modifying stored data', async () => {
    const core = make()
    await expect(core.addNote(' ')).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    await expect(core.removeNote('../file')).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    await expect(core.removeNote('00000000-0000-4000-8000-000000000000')).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })
    await expect(core.updateSettings({ closeAction: 'bad' } as never)).rejects.toMatchObject({
      code: 'INVALID_INPUT'
    })
    expect(await core.listNotes()).toEqual([])
    expect(await core.getSettings()).toEqual({ closeAction: 'tray' })
  })
  it('backs up invalid stored data and starts with defaults', async () => {
    await writeFile(join(dir, 'notes.json'), 'broken')
    expect(await make().listNotes()).toEqual([])
  })
  it('does not publish failed writes and recovers the mutation queue', async () => {
    const write = vi.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(undefined)
    const publish = vi.fn()
    const service = createNoteService({ read: async () => [], write }, publish)
    await expect(service.addNote('first')).rejects.toThrow('disk full')
    expect(publish).not.toHaveBeenCalled()
    await service.addNote('second')
    expect(write).toHaveBeenCalledTimes(2)
    expect(publish).toHaveBeenCalledOnce()
  })
})

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState } from '../../shared/defaults'
import { StateStore } from '../../server/store'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
let dir: string
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'mk-store-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })
const mk = () => new StateStore({ dataDir: dir, catalog: idx })

function namedState(name: string) {
  const s = createDefaultState(idx, 0)
  s.draft.players[0].name = name
  return JSON.stringify(s)
}

describe('StateStore', () => {
  it('starts from defaults and persists atomically', async () => {
    const store = mk(); await store.load()
    expect(store.state.draft.players[0].name).toBe('Player 1')
    expect(store.dispatch({ type: 'setPlayer', index: 0, patch: { name: 'SAM' } })).toEqual({ ok: true })
    await store.flush()
    expect(JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8')).draft.players[0].name).toBe('SAM')
    expect(readdirSync(dir)).not.toContain('state.json.tmp')
  })
  it('debounces saves', async () => {
    const store = mk(); await store.load()
    store.dispatch({ type: 'setPlayer', index: 0, patch: { name: 'A' } })
    await new Promise((r) => setTimeout(r, 400))
    expect(JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8')).draft.players[0].name).toBe('A')
  })
  it('rejects bad commands without throwing', async () => {
    const store = mk(); await store.load()
    expect(store.dispatch({ type: 'bogus' }).ok).toBe(false)
    expect(store.dispatch(null).ok).toBe(false)
    expect(store.dispatch({ type: 'setLayers', outputId: 'nope', patch: {} })).toEqual({ ok: false, error: expect.stringMatching(/nope/) })
  })
  it('notifies listeners and supports unsubscribe', async () => {
    const store = mk(); await store.load()
    let n = 0
    const off = store.onChange(() => { n++ })
    store.dispatch({ type: 'setTransition', speed: 'slow' }); expect(n).toBe(1)
    off(); store.dispatch({ type: 'setTransition', speed: 'fast' }); expect(n).toBe(1)
  })
  it('corrupt state.json falls back to newest valid backup', async () => {
    mkdirSync(join(dir, 'backups'))
    writeFileSync(join(dir, 'backups', 'state-2026-01-01T00-00-00-000Z-000.json'), namedState('OLD'))
    writeFileSync(join(dir, 'backups', 'state-2026-02-01T00-00-00-000Z-000.json'), namedState('BACKUP'))
    writeFileSync(join(dir, 'backups', 'state-2026-03-01T00-00-00-000Z-000.json'), '{broken')
    writeFileSync(join(dir, 'state.json'), '{not json')
    const s2 = mk(); await s2.load()
    expect(s2.state.draft.players[0].name).toBe('BACKUP')
    await s2.flush()
    expect(JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8')).draft.players[0].name).toBe('BACKUP')
  })
  it('schema-invalid state.json is treated as corrupt; no valid files gives defaults', async () => {
    writeFileSync(join(dir, 'state.json'), JSON.stringify({ draft: 1 }))
    const s = mk(); await s.load()
    expect(s.state.draft.players[0].name).toBe('Player 1')
    mkdirSync(join(dir, 'backups'), { recursive: true })
    writeFileSync(join(dir, 'backups', 'state-x.json'), 'nope')
    writeFileSync(join(dir, 'state.json'), '')
    const s2 = mk(); await s2.load()
    expect(s2.state.outputs).toHaveLength(4)
  })
  it('keeps at most 10 backups', async () => {
    for (let i = 0; i < 12; i++) {
      const s = mk(); await s.load(); s.dispatch({ type: 'setTransition', speed: i % 2 ? 'fast' : 'slow' }); await s.flush()
    }
    expect(readdirSync(join(dir, 'backups'))).toHaveLength(10)
  })
  it('reset returns defaults', async () => {
    const store = mk(); await store.load()
    store.dispatch({ type: 'setPlayer', index: 0, patch: { name: 'X' } })
    store.reset()
    expect(store.state.draft.players[0].name).toBe('Player 1')
    await store.flush()
  })
  it('persists tournaments and repairs a dangling active match', async () => {
    const a = mk(); await a.load()
    a.dispatch({ type: 'createTournament', name: 'T' }); a.dispatch({ type: 'setActiveMatch', matchId: 'match-3' })
    await a.flush()
    const b = mk(); await b.load()
    expect(b.state.activeTournamentId).toBe('tournament-1'); expect(b.state.tournaments[0].activeMatchId).toBe('match-3')
    const raw = JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8'))
    raw.tournaments[0].activeMatchId = 'gone'; raw.activeTournamentId = 'nope'
    writeFileSync(join(dir, 'state.json'), JSON.stringify(raw))
    const c = mk(); await c.load()
    expect(c.state.tournaments[0].activeMatchId).toBe('match-1'); expect(c.state.activeTournamentId).toBeNull()
  })
})

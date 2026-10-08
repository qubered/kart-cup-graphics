import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CatalogIndex } from '../shared/catalog'
import { createDefaultState, emptyLayers } from '../shared/defaults'
import { CommandError, reduce } from '../shared/reducer'
import { commandSchema, showStateSchema } from '../shared/schema'
import type { ShowState } from '../shared/types'
import { activeTournament } from '../shared/tournament'
import { deriveView } from '../shared/view'

export interface StoreOptions { dataDir: string; catalog: CatalogIndex; now?: () => number; random?: () => number }
const MAX_BACKUPS = 10
const DEBOUNCE_MS = 200

export class StateStore {
  private current: ShowState
  private listeners = new Set<(s: ShowState) => void>()
  private timer: ReturnType<typeof setTimeout> | null = null
  private writing: Promise<void> = Promise.resolve()
  private dirty = false
  private readonly now: () => number
  private readonly random: () => number
  private readonly file: string
  private readonly backupDir: string

  constructor(private opts: StoreOptions) {
    this.now = opts.now ?? Date.now
    this.random = opts.random ?? Math.random
    this.file = join(opts.dataDir, 'state.json')
    this.backupDir = join(opts.dataDir, 'backups')
    this.current = createDefaultState(opts.catalog, this.now())
  }

  get state(): ShowState {
    return this.current
  }

  private parse(text: string): ShowState | null {
    try {
      const r = showStateSchema.safeParse(JSON.parse(text))
      return r.success ? this.normalise(r.data) : null
    } catch {
      return null
    }
  }

  /** Make a hand-edited but schema-valid state self-consistent (every output has layers and a program frame). */
  private normalise(s: ShowState): ShowState {
    // tournaments: drop empty ones, repair a dangling active match / active tournament
    const tournaments = s.tournaments.filter((t) => t.matches.length > 0).map((t) => (t.matches.some((m) => m.id === t.activeMatchId) ? t : { ...t, activeMatchId: t.matches[0].id }))
    s = { ...s, tournaments, activeTournamentId: tournaments.some((t) => t.id === s.activeTournamentId) ? s.activeTournamentId : null }
    const layers = { ...s.layers }
    const program = { ...s.program }
    for (const o of s.outputs) {
      layers[o.id] ??= emptyLayers()
      program[o.id] ??= { view: deriveView(s.draft, emptyLayers(), o, this.opts.catalog, activeTournament(s)), mode: 'cut', speed: s.transition, takenAt: this.now() }
    }
    for (const id of Object.keys(layers)) if (!s.outputs.some((o) => o.id === id)) delete layers[id]
    for (const id of Object.keys(program)) if (!s.outputs.some((o) => o.id === id)) delete program[id]
    return { ...s, layers, program, armed: s.armed.filter((a) => s.outputs.some((o) => o.id === a)) }
  }

  async load(): Promise<void> {
    await mkdir(this.backupDir, { recursive: true })
    let loaded: ShowState | null = null
    let fromMain = false
    if (existsSync(this.file)) {
      try {
        loaded = this.parse(await readFile(this.file, 'utf8'))
      } catch { /* unreadable */ }
      fromMain = loaded !== null
    }
    if (!loaded) {
      const names = (await readdir(this.backupDir).catch(() => [] as string[])).filter((n) => n.startsWith('state-') && n.endsWith('.json')).sort().reverse()
      for (const n of names) {
        try {
          loaded = this.parse(await readFile(join(this.backupDir, n), 'utf8'))
        } catch { loaded = null }
        if (loaded) break
      }
      if (existsSync(this.file)) await rename(this.file, `${this.file}.corrupt`).catch(() => {})
    }
    if (fromMain) {
      await this.backup()
    }
    this.current = loaded ?? createDefaultState(this.opts.catalog, this.now())
    if (!fromMain) this.schedule()
  }

  private async backup(): Promise<void> {
    const iso = new Date(this.now()).toISOString().replace(/[:.]/g, '-')
    let name = ''
    for (let seq = 0; ; seq++) {
      name = `state-${iso}-${String(seq).padStart(3, '0')}.json`
      if (!existsSync(join(this.backupDir, name))) break
    }
    await copyFile(this.file, join(this.backupDir, name))
    const all = (await readdir(this.backupDir)).filter((n) => n.startsWith('state-') && n.endsWith('.json')).sort()
    for (const old of all.slice(0, Math.max(0, all.length - MAX_BACKUPS))) await rm(join(this.backupDir, old), { force: true })
  }

  dispatch(cmd: unknown): { ok: true } | { ok: false; error: string } {
    const parsed = commandSchema.safeParse(cmd)
    if (!parsed.success) {
      const i = parsed.error.issues[0]
      return { ok: false, error: `Invalid command: ${i ? `${i.path.join('.')} ${i.message}` : 'bad shape'}` }
    }
    try {
      const next = reduce(this.current, parsed.data, { catalog: this.opts.catalog, now: this.now(), random: this.random })
      if (next !== this.current) {
        this.current = next
        this.schedule()
        for (const fn of [...this.listeners]) {
          try { fn(next) } catch { /* listener errors must not break dispatch */ }
        }
      }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof CommandError ? e.message : `Command failed: ${(e as Error).message}` }
    }
  }

  onChange(fn: (s: ShowState) => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  private schedule(): void {
    this.dirty = true
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => { this.timer = null; void this.write() }, DEBOUNCE_MS)
    this.timer.unref?.()
  }

  private write(): Promise<void> {
    this.writing = this.writing.then(async () => {
      if (!this.dirty) return
      this.dirty = false
      try {
        await mkdir(this.opts.dataDir, { recursive: true })
        const tmp = `${this.file}.tmp`
        await writeFile(tmp, JSON.stringify(this.current, null, 2))
        await rename(tmp, this.file)
      } catch (e) {
        console.error('[store] save failed:', (e as Error).message)
      }
    })
    return this.writing
  }

  async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null }
    await this.write()
  }

  reset(): void {
    this.current = createDefaultState(this.opts.catalog, this.now())
    this.schedule()
    for (const fn of [...this.listeners]) {
      try { fn(this.current) } catch { /* ignore */ }
    }
  }
}

// Thin HTTP client for the Kart Cup server's remote-control API (GET /api/presets, POST /api/command).
export type TakeMode = 'cut' | 'auto'
export interface PresetInfo { id: string; name: string }
export interface PresetList { presets: PresetInfo[]; cue: string | null; armed: string[] }

export const DEFAULT_SERVER = 'http://localhost:8080'

export function normaliseBase(url: string | undefined): string {
  const t = (url ?? '').trim().replace(/\/+$/, '')
  if (!t) return DEFAULT_SERVER
  return /^https?:\/\//i.test(t) ? t : `http://${t}`
}

export class KartCupClient {
  constructor(private base: () => string, private doFetch: typeof fetch = fetch) {}

  async presets(): Promise<PresetList> {
    const r = await this.doFetch(`${this.base()}/api/presets`, { signal: AbortSignal.timeout(3000) })
    if (!r.ok) throw new Error(`Server replied ${r.status}`)
    return (await r.json()) as PresetList
  }

  async command(cmd: Record<string, unknown>): Promise<void> {
    const r = await this.doFetch(`${this.base()}/api/command`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cmd), signal: AbortSignal.timeout(3000),
    })
    if (!r.ok) {
      const body = (await r.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? `Server replied ${r.status}`)
    }
  }
}

/** Settings value "none" (or anything unknown) means recall without taking to air. */
export function takeOf(v: unknown): TakeMode | undefined {
  return v === 'cut' || v === 'auto' ? v : undefined
}

export function recallCommand(presetId: string, take: unknown): Record<string, unknown> {
  const t = takeOf(take)
  return t ? { type: 'recallPreset', id: presetId, take: t } : { type: 'recallPreset', id: presetId }
}

export function stepCommand(direction: unknown, take: unknown): Record<string, unknown> {
  const t = takeOf(take)
  const base = { type: 'stepCue', delta: direction === 'prev' ? -1 : 1 }
  return t ? { ...base, take: t } : base
}

export function takeCommand(mode: unknown): Record<string, unknown> {
  return { type: 'take', mode: mode === 'auto' ? 'auto' : 'cut' }
}

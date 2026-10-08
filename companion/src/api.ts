// Client for the Kart Cup server's remote-control API (GET /api/presets, POST /api/command) and the commands the module sends.
export type TakeMode = 'cut' | 'auto'
export interface StackInfo {
  id: string; name: string; current: string | null; selected: string | null
  cues: { id: string; presetId: string; take: TakeMode | null }[]
}
export interface ServerState {
  presets: { id: string; name: string }[]
  lastPreset: string | null
  stacks: StackInfo[]
  armed: string[]
  outputs: { id: string; name: string }[]
  hold: boolean
  ftb: boolean
}
export type OnOffToggle = 'on' | 'off' | 'toggle'

export class KartCupApi {
  constructor(private base: () => string, private doFetch: typeof fetch = fetch) {}

  async state(): Promise<ServerState> {
    const r = await this.doFetch(`${this.base()}/api/presets`, { signal: AbortSignal.timeout(3000) })
    if (!r.ok) throw new Error(`Server replied ${r.status}`)
    return (await r.json()) as ServerState
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

export function baseUrl(host: unknown, port: unknown): string {
  const h = String(host ?? '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || '127.0.0.1'
  const p = Number(port)
  return `http://${h}${h.includes(':') || !Number.isInteger(p) || p <= 0 ? '' : `:${p}`}`
}

/** "none" (or anything else) means no take. */
export function takeOf(v: unknown): TakeMode | undefined {
  return v === 'cut' || v === 'auto' ? v : undefined
}

export function recallCommand(id: string, take: unknown): Record<string, unknown> {
  const t = takeOf(take)
  return t ? { type: 'recallPreset', id, take: t } : { type: 'recallPreset', id }
}

/** Move the standby (Preview) cue within a stack. */
export function stepSelectionCommand(stackId: string, direction: unknown): Record<string, unknown> {
  return { type: 'stepSelection', stackId, delta: direction === 'prev' ? -1 : 1 }
}

/** Cue dropdown values encode both ids: "<stackId>|<cueId>". */
export const cueKey = (stackId: string, cueId: string): string => `${stackId}|${cueId}`
export function splitCueKey(v: unknown): { stackId: string; cueId: string } | null {
  const [stackId, cueId] = String(v ?? '').split('|')
  return stackId && cueId ? { stackId, cueId } : null
}

export function cueActionCommand(type: 'selectCue' | 'fireCue', key: unknown): Record<string, unknown> | null {
  const k = splitCueKey(key)
  return k ? { type, ...k } : null
}

export type CueState = 'pgm' | 'pvw' | ''
export function cueState(stacks: StackInfo[], key: unknown): CueState {
  const k = splitCueKey(key)
  const stack = k && stacks.find((x) => x.id === k.stackId)
  if (!stack || !k) return ''
  return stack.current === k.cueId ? 'pgm' : stack.selected === k.cueId ? 'pvw' : ''
}

export function takeCommand(mode: unknown): Record<string, unknown> {
  return { type: 'take', mode: mode === 'auto' ? 'auto' : 'cut' }
}

export function resolveOnOff(mode: unknown, current: boolean): boolean {
  return mode === 'on' ? true : mode === 'off' ? false : !current
}

export function armCommand(armed: string[], outputId: string, mode: unknown): Record<string, unknown> {
  const on = resolveOnOff(mode, armed.includes(outputId))
  const rest = armed.filter((id) => id !== outputId)
  return { type: 'arm', outputIds: on ? [...rest, outputId] : rest }
}

import { writable, type Readable } from 'svelte/store'
import { connect } from '../lib/socket'
import { indexCatalog, type Catalog, type CatalogIndex } from '../../../shared/catalog'
import type { Command } from '../../../shared/types'
import type { ControlPayload, ServerMessage } from '../../../shared/protocol'

export interface ControlStore {
  payload: ControlPayload | null
  connected: boolean
  catalog: CatalogIndex | null
  selectedOutput: string
  error: string | null
}

const store = writable<ControlStore>({ payload: null, connected: false, catalog: null, selectedOutput: '', error: null })
export const control: Readable<ControlStore> = { subscribe: store.subscribe }

const conn = connect(
  { role: 'control' },
  {
    onMessage(m: ServerMessage) {
      if (m.type === 'state') {
        store.update((s) => {
          const ids = m.state.outputs.map((o) => o.id)
          const selectedOutput = ids.includes(s.selectedOutput) ? s.selectedOutput : (ids[0] ?? '')
          return { ...s, payload: m, selectedOutput }
        })
      } else if (m.type === 'error') {
        store.update((s) => ({ ...s, error: m.message }))
        setTimeout(() => store.update((s) => (s.error === m.message ? { ...s, error: null } : s)), 4000)
      }
    },
    onStatus(up: boolean) {
      store.update((s) => ({ ...s, connected: up }))
    },
  },
)

export function send(cmd: Command): void {
  conn.send(cmd)
}

export function selectOutput(id: string): void {
  store.update((s) => ({ ...s, selectedOutput: id }))
}

fetch('/assets/catalog.json')
  .then((r) => r.json() as Promise<Catalog>)
  .then((c) => store.update((s) => ({ ...s, catalog: indexCatalog(c) })))
  .catch(() => {})

import type http from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'
import type { CatalogIndex } from '../shared/catalog'
import { buildControlPayload, buildOutputPayload, clientMessageSchema, type Presence, type Subscription } from '../shared/protocol'
import type { StateStore } from './store'

interface Client { ws: WebSocket; sub: Subscription | null; last: number; sent?: string }

export function attachSockets(server: http.Server, store: StateStore, catalog: CatalogIndex): { presence(): Presence; close(): void } {
  const wss = new WebSocketServer({ server })
  const clients = new Set<Client>()

  const presence = (): Presence => {
    const p: Presence = {}
    for (const o of store.state.outputs) p[o.id] = { program: 0, preview: 0, left: 0, right: 0 }
    for (const c of clients) {
      if (c.sub?.role !== 'output') continue
      const e = (p[c.sub.outputId] ??= { program: 0, preview: 0, left: 0, right: 0 })
      e[c.sub.view]++
      if (c.sub.part && c.sub.view === 'program') e[c.sub.part]++
    }
    return p
  }
  const put = (c: Client, m: unknown) => { if (c.ws.readyState === c.ws.OPEN) c.ws.send(JSON.stringify(m)) }
  const payloadFor = (c: Client) => {
    const s = c.sub
    if (!s) return null
    if (s.role === 'output') return buildOutputPayload(store.state, s.outputId, s.view, catalog)
    return buildControlPayload(store.state, presence(), catalog)
  }
  const push = (c: Client, force = false) => {
    const m = payloadFor(c)
    if (!m) return
    const text = JSON.stringify(m)
    // Outputs only get a message when their own payload changed (draft edits must not touch Program).
    if (!force && c.sub?.role === 'output' && c.sent === text) return
    c.sent = text
    if (c.ws.readyState === c.ws.OPEN) c.ws.send(text)
  }
  const pushAll = () => { for (const c of clients) push(c) }
  const pushControl = () => { for (const c of clients) if (c.sub && c.sub.role !== 'output') push(c) }

  const off = store.onChange(pushAll)

  wss.on('connection', (ws) => {
    const c: Client = { ws, sub: null, last: Date.now() }
    clients.add(c)
    ws.on('message', (data) => {
      c.last = Date.now()
      let raw: unknown
      try { raw = JSON.parse(data.toString()) } catch { return put(c, { type: 'error', message: 'Invalid JSON' }) }
      const r = clientMessageSchema.safeParse(raw)
      if (!r.success) return put(c, { type: 'error', message: 'Invalid message' })
      const m = r.data
      if (m.type === 'ping') return put(c, { type: 'pong' })
      if (m.type === 'subscribe') {
        c.sub = m.sub
        push(c, true)
        pushControl()
        return
      }
      if (m.type === 'command') {
        const out = store.dispatch(m.command)
        if (!out.ok) put(c, { type: 'error', message: out.error })
      }
    })
    ws.on('close', () => { clients.delete(c); pushControl() })
    ws.on('error', () => ws.terminate())
  })

  const reaper = setInterval(() => {
    const now = Date.now()
    for (const c of clients) if (now - c.last > 15000) c.ws.terminate()
  }, 5000)

  return {
    presence,
    close() {
      clearInterval(reaper)
      off()
      for (const c of clients) c.ws.terminate()
      wss.close()
    },
  }
}

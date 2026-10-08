import type { Command } from '../../../shared/types'
import type { ClientMessage, ServerMessage, Subscription } from '../../../shared/protocol'

export function nextDelay(attempt: number): number {
  return Math.min(500 * 2 ** attempt, 5000)
}

export interface SocketHandlers {
  onMessage(m: ServerMessage): void
  onStatus?(up: boolean): void
}
export interface SocketOpts { url?: string; WebSocketImpl?: typeof WebSocket; now?: () => number }

const PING_MS = 5000
const STALE_MS = 10000

export function connect(
  sub: Subscription,
  h: SocketHandlers,
  opts: SocketOpts = {},
): { send(cmd: Command): void; close(): void } {
  const WS = opts.WebSocketImpl ?? WebSocket
  const now = opts.now ?? (() => Date.now())
  const url =
    opts.url ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
  let ws: WebSocket | null = null
  let attempt = 0
  let closed = false
  let up = false
  let lastMsg = now()
  let pingTimer: ReturnType<typeof setInterval> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  const raw = (m: ClientMessage) => {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(m))
  }
  const setUp = (v: boolean) => {
    if (up !== v) {
      up = v
      h.onStatus?.(v)
    }
  }
  const clearTimers = () => {
    if (pingTimer) clearInterval(pingTimer)
    pingTimer = null
  }
  const scheduleRetry = () => {
    if (closed || retryTimer) return
    const d = nextDelay(attempt++)
    retryTimer = setTimeout(() => {
      retryTimer = null
      open()
    }, d)
  }
  const drop = (sock: WebSocket) => {
    if (ws !== sock) return
    ws = null
    clearTimers()
    setUp(false)
    scheduleRetry()
  }
  function open() {
    if (closed) return
    const sock = new WS(url)
    ws = sock
    sock.onopen = () => {
      if (ws !== sock) return
      attempt = 0
      lastMsg = now()
      setUp(true)
      raw({ type: 'subscribe', sub })
      clearTimers()
      pingTimer = setInterval(() => {
        if (now() - lastMsg > STALE_MS) {
          const s = ws
          if (s) {
            try { s.close() } catch { /* ignore */ }
            drop(s)
          }
          return
        }
        raw({ type: 'ping' })
      }, PING_MS)
    }
    sock.onmessage = (ev: MessageEvent) => {
      if (ws !== sock) return
      lastMsg = now()
      try {
        h.onMessage(JSON.parse(String(ev.data)) as ServerMessage)
      } catch { /* ignore malformed */ }
    }
    sock.onclose = () => drop(sock)
    sock.onerror = () => { /* close follows */ }
  }
  open()
  return {
    send(command) {
      raw({ type: 'command', command })
    },
    close() {
      closed = true
      clearTimers()
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = null
      const s = ws
      ws = null
      try { s?.close() } catch { /* ignore */ }
      setUp(false)
    },
  }
}

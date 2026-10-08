import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { connect, nextDelay } from '../../web/src/lib/socket'

class MockWS {
  static instances: MockWS[] = []
  readyState = 0
  sent: string[] = []
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  constructor(public url: string) { MockWS.instances.push(this) }
  send(s: string) { this.sent.push(s) }
  close() { this.readyState = 3; this.onclose?.() }
  open() { this.readyState = 1; this.onopen?.() }
}
const impl = MockWS as unknown as typeof WebSocket

describe('socket', () => {
  beforeEach(() => { MockWS.instances = []; vi.useFakeTimers() })
  afterEach(() => vi.useRealTimers())

  it('nextDelay', () => {
    expect([0, 1, 4].map(nextDelay)).toEqual([500, 1000, 5000])
  })
  it('subscribes, reconnects after close, drops sends while down', () => {
    const status: boolean[] = []
    const c = connect({ role: 'control' }, { onMessage() {}, onStatus: (u) => status.push(u) }, { url: 'ws://x', WebSocketImpl: impl })
    const a = MockWS.instances[0]
    a.open()
    expect(JSON.parse(a.sent[0])).toEqual({ type: 'subscribe', sub: { role: 'control' } })
    a.close()
    expect(status).toEqual([true, false])
    c.send({ type: 'noop' } as never)
    expect(a.sent).toHaveLength(1)
    vi.advanceTimersByTime(nextDelay(0))
    expect(MockWS.instances).toHaveLength(2)
    MockWS.instances[1].open()
    expect(MockWS.instances[1].sent).toHaveLength(1)
    c.close()
  })
  it('pings and reconnects when silent', () => {
    let t = 0
    const c = connect({ role: 'multiview' }, { onMessage() {} }, { url: 'ws://x', WebSocketImpl: impl, now: () => t })
    const a = MockWS.instances[0]
    a.open()
    t = 5000; vi.advanceTimersByTime(5000)
    expect(a.sent.map((s) => JSON.parse(s).type)).toEqual(['subscribe', 'ping'])
    t = 15000; vi.advanceTimersByTime(10000)
    vi.advanceTimersByTime(600)
    expect(MockWS.instances.length).toBeGreaterThan(1)
    c.close()
  })
})

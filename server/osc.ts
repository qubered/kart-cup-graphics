import dgram from 'node:dgram'
import { encodeOsc } from '../shared/osc'
import type { OscCue } from '../shared/types'

/** Fires an OSC cue's messages as UDP datagrams. Fire and forget: a failing target is logged, never allowed to hold up the show. */
export function createOscSender(): { send(cue: OscCue): void; close(): void } {
  let sock: dgram.Socket | null = null
  const get = () => {
    if (!sock) {
      sock = dgram.createSocket('udp4')
      sock.on('error', (e) => console.error('[osc]', e.message))
      sock.unref()
    }
    return sock
  }
  return {
    send(cue) {
      for (const m of cue.messages) {
        get().send(encodeOsc(m), cue.port, cue.host, (e) => { if (e) console.error(`[osc] ${cue.host}:${cue.port} ${m.address}: ${e.message}`) })
      }
    },
    close() { sock?.close(); sock = null },
  }
}

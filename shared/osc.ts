// OSC 1.0 encoding and the one-line text form the cue editor uses ("/cmd "Go+ Sequence 1""). No Node APIs: runs in the browser too.
import type { OscArg, OscMessage } from './types'

const text = new TextEncoder()

function pad(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(Math.ceil((bytes.length + 1) / 4) * 4)
  out.set(bytes)
  return out
}

/** An OSC packet for one message. Integers go out as int32 ('i'), other numbers as float32 ('f'), strings as 's', booleans as 'T' / 'F'. */
export function encodeOsc(msg: OscMessage): Uint8Array {
  const tags = ',' + msg.args.map((a) => (typeof a === 'boolean' ? (a ? 'T' : 'F') : typeof a === 'string' ? 's' : Number.isInteger(a) && Math.abs(a) <= 2147483647 ? 'i' : 'f')).join('')
  const parts: Uint8Array[] = [pad(text.encode(msg.address)), pad(text.encode(tags))]
  for (const a of msg.args) {
    if (typeof a === 'boolean') continue
    if (typeof a === 'string') { parts.push(pad(text.encode(a))); continue }
    const b = new DataView(new ArrayBuffer(4))
    if (Number.isInteger(a) && Math.abs(a) <= 2147483647) b.setInt32(0, a)
    else b.setFloat32(0, a)
    parts.push(new Uint8Array(b.buffer))
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) { out.set(p, at); at += p.length }
  return out
}

function parseArg(tok: { v: string; quoted: boolean }): OscArg {
  if (tok.quoted) return tok.v
  if (tok.v === 'true') return true
  if (tok.v === 'false') return false
  return tok.v !== '' && Number.isFinite(Number(tok.v)) ? Number(tok.v) : tok.v
}

/** "/cmd "Go+ Sequence 1" 3 true" -> { address: '/cmd', args: ['Go+ Sequence 1', 3, true] }. Quote a value to keep it a string. Null if it does not start with "/". */
export function parseOscLine(line: string): OscMessage | null {
  const toks: { v: string; quoted: boolean }[] = []
  const re = /"((?:[^"\\]|\\.)*)"|(\S+)/g
  const s = line.trim()
  for (let m = re.exec(s); m; m = re.exec(s)) toks.push(m[1] !== undefined ? { v: m[1].replace(/\\(.)/g, '$1'), quoted: true } : { v: m[2], quoted: false })
  const [head, ...rest] = toks
  if (!head || head.quoted || !/^\/\S*$/.test(head.v)) return null
  return { address: head.v, args: rest.map(parseArg) }
}

/** The inverse of parseOscLine. */
export function formatOscLine(msg: OscMessage): string {
  const arg = (a: OscArg) => (typeof a === 'string' ? (a === '' || /\s|"/.test(a) || a === 'true' || a === 'false' || Number.isFinite(Number(a)) ? `"${a.replace(/["\\]/g, '\\$&')}"` : a) : String(a))
  return [msg.address, ...msg.args.map(arg)].join(' ')
}

export const parseOscLines = (block: string): OscMessage[] => block.split('\n').flatMap((l) => { const m = parseOscLine(l); return m ? [m] : [] })
export const formatOscLines = (msgs: OscMessage[]): string => msgs.map(formatOscLine).join('\n')

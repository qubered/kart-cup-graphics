import type { IncomingMessage, ServerResponse } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import type { ViteDevServer } from 'vite'
import { showFileSchema } from '../shared/schema'
import type { ShowFile } from '../shared/types'
import type { StateStore } from './store'
import { lanUrls } from './lan'

export interface HttpOpts {
  distDir: string
  assetsDir: string
  dataDir: string
  store: StateStore
  vite?: ViteDevServer
  port?: () => number
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.ttf': 'font/ttf',
  '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.map': 'application/json', '.ico': 'image/x-icon',
}
const FONT_EXT = new Set(['.ttf', '.otf', '.woff', '.woff2'])
const MAX_FONT = 10 * 1024 * 1024
const MAX_IMPORT = 20 * 1024 * 1024

function send(res: ServerResponse, status: number, body: string, type = 'text/plain; charset=utf-8', extra: Record<string, string> = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra })
  res.end(body)
}
const json = (res: ServerResponse, status: number, v: unknown, extra: Record<string, string> = {}) =>
  send(res, status, JSON.stringify(v), 'application/json; charset=utf-8', extra)

function serveFile(res: ServerResponse, root: string, rel: string, method: string): boolean {
  let decoded: string
  try { decoded = decodeURIComponent(rel) } catch { send(res, 400, 'Bad request'); return true }
  if (decoded.includes('\0')) { send(res, 400, 'Bad request'); return true }
  const rootAbs = resolve(root)
  const file = resolve(join(rootAbs, normalize('/' + decoded)))
  if (file !== rootAbs && !file.startsWith(rootAbs + sep)) { send(res, 403, 'Forbidden'); return true }
  if (!existsSync(file) || !statSync(file).isFile()) return false
  res.writeHead(200, {
    'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': statSync(file).size,
    'Cache-Control': 'no-store',
  })
  if (method === 'HEAD') res.end()
  else createReadStream(file).pipe(res)
  return true
}

class TooLarge extends Error {}
function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((ok, fail) => {
    const chunks: Buffer[] = []
    let n = 0
    req.on('data', (c: Buffer) => {
      n += c.length
      if (n > limit) { fail(new TooLarge()); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => ok(Buffer.concat(chunks)))
    req.on('error', fail)
  })
}

export function createHttpHandler(opts: HttpOpts): (req: IncomingMessage, res: ServerResponse) => void {
  const { distDir, assetsDir, dataDir, store, vite } = opts

  const page = (res: ServerResponse, req: IncomingMessage, name: string) => {
    if (vite) {
      req.url = `/${name}.html`
      res.setHeader('Cache-Control', 'no-store')
      vite.middlewares(req, res, () => send(res, 404, 'Not found'))
      return
    }
    if (!serveFile(res, distDir, `${name}.html`, req.method ?? 'GET')) send(res, 404, 'Not found')
  }

  async function api(req: IncomingMessage, res: ServerResponse, path: string) {
    const method = req.method ?? 'GET'
    if (path === '/api/info' && method === 'GET') {
      return json(res, 200, { lanUrls: lanUrls(opts.port ? opts.port() : Number((req.socket.localPort) ?? 8080)) })
    }
    // Remote-control API (Companion etc.): list presets, and run any command through the same validation as the websocket.
    if (path === '/api/presets' && method === 'GET') {
      const s = store.state
      return json(res, 200, {
        presets: s.presets.map((p) => ({ id: p.id, name: p.name })), lastPreset: s.lastPreset, armed: s.armed,
        stacks: s.stacks.map((k) => ({ id: k.id, name: k.name, current: k.current, selected: k.selected, cues: k.cues.map((c) => ({ id: c.id, presetId: c.presetId, take: c.take })) })),
        outputs: s.outputs.map((o) => ({ id: o.id, name: o.name })), hold: s.overlay.hold.on, ftb: s.overlay.ftb,
      })
    }
    if (path === '/api/command' && method === 'POST') {
      let raw: Buffer
      try { raw = await readBody(req, 1024 * 1024) } catch { return json(res, 400, { error: 'Body too large or unreadable' }) }
      let cmd: unknown
      try { cmd = JSON.parse(raw.toString('utf8')) } catch { return json(res, 400, { error: 'Invalid JSON' }) }
      const out = store.dispatch(cmd)
      return out.ok ? json(res, 200, { ok: true }) : json(res, 400, { error: out.error })
    }
    if (path === '/api/export' && method === 'GET') {
      const s = store.state
      const file: ShowFile = { draft: s.draft, outputs: s.outputs, layers: s.layers, transition: s.transition, presets: s.presets, stacks: s.stacks }
      return json(res, 200, file, { 'Content-Disposition': 'attachment; filename="show.json"' })
    }
    if (path === '/api/import' && method === 'POST') {
      let raw: Buffer
      try { raw = await readBody(req, MAX_IMPORT) } catch { return json(res, 400, { error: 'Body too large or unreadable' }) }
      let parsed: unknown
      try { parsed = JSON.parse(raw.toString('utf8')) } catch { return json(res, 400, { error: 'Invalid JSON' }) }
      const r = showFileSchema.safeParse(parsed)
      if (!r.success) return json(res, 400, { error: 'Invalid show file: ' + r.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') })
      const out = store.dispatch({ type: 'importShow', file: r.data })
      return out.ok ? json(res, 200, { ok: true }) : json(res, 400, { error: out.error })
    }
    const m = /^\/api\/fonts\/([^/]*)$/.exec(path)
    if (m && method === 'PUT') {
      let name: string
      try { name = decodeURIComponent(m[1]) } catch { return json(res, 400, { error: 'Bad filename' }) }
      const ext = extname(name).toLowerCase()
      if (!/^[A-Za-z0-9 _.-]+$/.test(name) || name.includes('..') || !FONT_EXT.has(ext) || name.length === ext.length) {
        return json(res, 400, { error: 'Filename must be A-Z a-z 0-9 space _ . - and end in .ttf, .otf, .woff or .woff2' })
      }
      const declared = Number(req.headers['content-length'] ?? 0)
      if (declared > MAX_FONT) return json(res, 400, { error: 'Font larger than 10 MB' })
      let body: Buffer
      try { body = await readBody(req, MAX_FONT) } catch (e) {
        return json(res, 400, { error: e instanceof TooLarge ? 'Font larger than 10 MB' : 'Upload failed' })
      }
      if (body.length === 0) return json(res, 400, { error: 'Empty file' })
      const dir = join(dataDir, 'uploads', 'fonts')
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, name), body)
      const family = name.slice(0, name.length - ext.length)
      const out = store.dispatch({ type: 'registerFont', family, file: name })
      return out.ok ? json(res, 200, { family }) : json(res, 400, { error: out.error })
    }
    return json(res, 404, { error: 'Not found' })
  }

  return (req, res) => {
    const method = req.method ?? 'GET'
    const url = new URL(req.url ?? '/', 'http://x')
    const path = url.pathname
    const run = async () => {
      if (path.startsWith('/api/')) return api(req, res, path)
      if (method !== 'GET' && method !== 'HEAD') return send(res, 405, 'Method not allowed')
      if (path === '/') return send(res, 302, '', 'text/plain', { Location: '/control' })
      if (path === '/control') return page(res, req, 'control')
      if (path === '/multiview') return page(res, req, 'multiview')
      if (/^\/out\/[^/]+(\/(left|right))?\/?$/.test(path)) return page(res, req, 'out')
      if (path.startsWith('/assets/')) {
        if (serveFile(res, assetsDir, path.slice('/assets/'.length), method)) return
        if (!vite && serveFile(res, distDir, path.slice(1), method)) return
        return send(res, 404, 'Not found')
      }
      if (path.startsWith('/uploads/')) {
        if (!serveFile(res, join(dataDir, 'uploads'), path.slice('/uploads/'.length), method)) send(res, 404, 'Not found')
        return
      }
      if (vite) {
        res.setHeader('Cache-Control', 'no-store')
        return vite.middlewares(req, res, () => send(res, 404, 'Not found'))
      }
      if (!serveFile(res, distDir, path.slice(1), method)) send(res, 404, 'Not found')
    }
    run().catch((e) => { if (!res.headersSent) send(res, 500, String(e?.message ?? e)); else res.end() })
  }
}

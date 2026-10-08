import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import WebSocket from 'ws'
import { startServer } from '../../server/app'
import { fixtureCatalog } from '../fixtures/catalog'
import type { Subscription } from '../../shared/protocol'

let srv: Awaited<ReturnType<typeof startServer>>
let base: string
let tmp: string
const open: { close(): void }[] = []

async function client(sub: Subscription) {
  const ws = new WebSocket(`ws://localhost:${srv.port}`)
  const messages: any[] = []
  ws.on('message', (d) => messages.push(JSON.parse(d.toString())))
  await new Promise<void>((ok, fail) => { ws.once('open', () => ok()); ws.once('error', fail) })
  ws.send(JSON.stringify({ type: 'subscribe', sub }))
  await expect.poll(() => messages.length).toBeGreaterThan(0)
  const c = {
    messages,
    send: (m: unknown) => ws.send(JSON.stringify(m)),
    last: () => messages[messages.length - 1],
    close: () => ws.close(),
  }
  open.push(c)
  return c
}

beforeAll(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'kcg-app-'))
  const distDir = join(tmp, 'dist'); mkdirSync(distDir)
  for (const n of ['control', 'out', 'multiview']) writeFileSync(join(distDir, `${n}.html`), `<html>stub-${n}</html>`)
  const assetsDir = join(tmp, 'assets'); mkdirSync(assetsDir); writeFileSync(join(assetsDir, 'hello.txt'), 'hi')
  srv = await startServer({ port: 0, dataDir: join(tmp, 'data'), assetsDir, distDir, dev: false, catalog: fixtureCatalog })
  base = `http://localhost:${srv.port}`
})
afterAll(async () => {
  open.forEach((c) => c.close())
  await srv.close()
  rmSync(tmp, { recursive: true, force: true })
})

describe('http', () => {
  it('routes pages with no-store', async () => {
    const r = await fetch(`${base}/out/wide`)
    expect(r.headers.get('cache-control')).toBe('no-store')
    expect(await r.text()).toContain('stub-out')
    expect(await (await fetch(`${base}/control`)).text()).toContain('stub-control')
    expect(await (await fetch(`${base}/multiview`)).text()).toContain('stub-multiview')
    const root = await fetch(`${base}/`, { redirect: 'manual' })
    expect(root.status).toBe(302)
    expect(root.headers.get('location')).toBe('/control')
    expect(await (await fetch(`${base}/assets/hello.txt`)).text()).toBe('hi')
    expect((await fetch(`${base}/assets/..%2f..%2fsecret`)).status).toBeGreaterThanOrEqual(400)
  })
  it('serves /api/info', async () => {
    const j = await (await fetch(`${base}/api/info`)).json()
    expect(Array.isArray(j.lanUrls)).toBe(true)
    expect(j.lanUrls.length).toBeGreaterThan(0)
  })
})

describe('websocket hub', () => {
  it('syncs, isolates outputs, tracks presence, handles unknown outputs and ping', async () => {
    const wide = await client({ role: 'output', outputId: 'wide', view: 'program' })
    const twins = await client({ role: 'output', outputId: 'twins', view: 'program' })
    const ctlA = await client({ role: 'control' })
    const ctlB = await client({ role: 'control' })
    ctlA.send({ type: 'command', command: { type: 'arm', outputIds: ['wide'] } })
    ctlA.send({ type: 'command', command: { type: 'take', mode: 'auto' } })
    await expect.poll(() => wide.last().view?.background?.id).toBe('A')
    expect(twins.messages.filter((m) => m.type === 'output')).toHaveLength(1)
    await expect.poll(() => ctlB.last().state.armed).toEqual(['wide'])
    await expect.poll(() => ctlA.last().presence.wide.program).toBe(1)
    wide.close()
    await expect.poll(() => ctlA.last().presence.wide.program).toBe(0)

    const ghost = await client({ role: 'output', outputId: 'lobby', view: 'program' })
    expect(ghost.last().view).toBeNull()
    ctlA.send({ type: 'command', command: { type: 'addOutput', output: { id: 'lobby', name: 'Lobby', format: 'hd', safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, graphicsScale: 1 } } })
    await expect.poll(() => ghost.last().view?.format).toBe('hd')

    ctlA.send({ type: 'command', command: { type: 'setLayers', outputId: 'nope', patch: {} } })
    await expect.poll(() => ctlA.messages.some((m) => m.type === 'error')).toBe(true)
    expect(ctlB.messages.some((m) => m.type === 'error')).toBe(false)

    ctlA.send({ type: 'ping' })
    await expect.poll(() => ctlA.messages.some((m) => m.type === 'pong')).toBe(true)
  })
})

describe('remote-control api', () => {
  const post = (body: unknown) => fetch(`${base}/api/command`, { method: 'POST', body: JSON.stringify(body) })
  it('saves, lists and recalls presets over http', async () => {
    expect((await post({ type: 'setLayers', outputId: 'pillars', patch: { background: 'C' } })).status).toBe(200)
    await post({ type: 'arm', outputIds: ['pillars'] })
    expect((await post({ type: 'savePreset', name: 'Pillars C' })).status).toBe(200)
    const list = await (await fetch(`${base}/api/presets`)).json()
    expect(list.presets.at(-1).name).toBe('Pillars C')
    const id = list.presets.at(-1).id
    await post({ type: 'setLayers', outputId: 'pillars', patch: { background: 'none' } })
    expect((await post({ type: 'recallPreset', id, take: 'cut' })).status).toBe(200)
    expect(srv.store.state.program.pillars.view.background?.id).toBe('C')
  })
  it('rejects bad commands', async () => {
    expect((await post({ type: 'recallPreset', id: 'nope' })).status).toBe(400)
    expect((await post({ type: 'nonsense' })).status).toBe(400)
    expect((await fetch(`${base}/api/command`, { method: 'POST', body: 'x' })).status).toBe(400)
  })
})

describe('fonts and import/export', () => {
  const put = (name: string, body: BodyInit = 'FONTDATA') => fetch(`${base}/api/fonts/${name}`, { method: 'PUT', body })
  it('rejects bad font names', async () => {
    expect((await put('..%2Fevil.ttf')).status).toBe(400)
    expect((await put('Comic.exe')).status).toBe(400)
    expect((await put('a%2Fb.ttf')).status).toBe(400)
  })
  it('rejects oversized fonts', async () => {
    expect((await put('Big.ttf', new Uint8Array(10 * 1024 * 1024 + 1))).status).toBe(400)
  })
  it('stores and registers a valid font', async () => {
    const r = await put('MyFont.ttf')
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ family: 'MyFont' })
    expect(srv.store.state.uploadedFonts).toContainEqual({ family: 'MyFont', file: 'MyFont.ttf' })
    expect(existsSync(join(tmp, 'data', 'uploads', 'fonts', 'MyFont.ttf'))).toBe(true)
    expect(await (await fetch(`${base}/uploads/fonts/MyFont.ttf`)).text()).toBe('FONTDATA')
  })
  it('round-trips export/import and rejects invalid files', async () => {
    const c = await client({ role: 'control' })
    c.send({ type: 'command', command: { type: 'setPlayer', index: 0, patch: { name: 'ROUNDTRIP' } } })
    await expect.poll(() => srv.store.state.draft.players[0].name).toBe('ROUNDTRIP')
    const exp = await fetch(`${base}/api/export`)
    const text = await exp.text()
    const before = structuredClone(srv.store.state.draft)
    c.send({ type: 'command', command: { type: 'setPlayer', index: 0, patch: { name: 'CHANGED' } } })
    await expect.poll(() => srv.store.state.draft.players[0].name).toBe('CHANGED')
    const imp = await fetch(`${base}/api/import`, { method: 'POST', body: text })
    expect(imp.status).toBe(200)
    expect(srv.store.state.draft).toEqual(before)
    expect((await fetch(`${base}/api/import`, { method: 'POST', body: '{}' })).status).toBe(400)
    expect((await fetch(`${base}/api/import`, { method: 'POST', body: 'nope' })).status).toBe(400)
  })
})

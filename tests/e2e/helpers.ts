import WebSocket from 'ws'
import type { Page } from '@playwright/test'
import type { Command, ShowState } from '../../shared/types'
import type { ServerMessage } from '../../shared/protocol'

const WS_URL = process.env.E2E_WS ?? `ws://localhost:${process.env.E2E_PORT ?? 8099}/ws`

function open(): Promise<{ ws: WebSocket; next(type: ServerMessage['type']): Promise<ServerMessage> }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL)
    const queue: ServerMessage[] = []
    const waiters: { type: string; res(m: ServerMessage): void; rej(e: Error): void }[] = []
    const pump = () => {
      for (let i = 0; i < waiters.length; i++) {
        const idx = queue.findIndex(m => m.type === waiters[i].type)
        if (idx >= 0) { const [m] = queue.splice(idx, 1); const [w] = waiters.splice(i, 1); w.res(m); i-- }
      }
    }
    ws.on('message', raw => {
      const m = JSON.parse(String(raw)) as ServerMessage
      if (m.type === 'error') { const w = waiters.shift(); if (w) w.rej(new Error(m.message)); return }
      queue.push(m); pump()
    })
    ws.on('error', reject)
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'subscribe', sub: { role: 'control' } }))
      resolve({
        ws,
        next: type => new Promise<ServerMessage>((res, rej) => {
          const t = setTimeout(() => rej(new Error(`timeout waiting for ${type}`)), 5000)
          waiters.push({ type, res: m => { clearTimeout(t); res(m) }, rej: e => { clearTimeout(t); rej(e) } }); pump()
        }),
      })
    })
  })
}

/** Send one command as a control client and resolve once the server has processed it (ping/pong barrier). */
export async function command(cmd: Command): Promise<void> {
  const c = await open()
  try {
    await c.next('state')
    c.ws.send(JSON.stringify({ type: 'command', command: cmd }))
    c.ws.send(JSON.stringify({ type: 'ping' }))
    await c.next('pong')
  } finally { c.ws.close() }
}

export async function state(): Promise<ShowState> {
  const c = await open()
  try {
    const m = await c.next('state')
    return (m as Extract<ServerMessage, { type: 'state' }>).state
  } finally { c.ws.close() }
}

export async function resetShow(): Promise<void> { await command({ type: 'resetShow' }) }

export type PageId = 'live' | 'race' | 'tour' | 'setup'
/** Open a page of the control UI (top-bar navigation). Call after `page.goto('/control')`. */
export async function openPage(page: Page, id: PageId): Promise<void> {
  await page.locator(`[data-page=${id}]`).click()
}
/** Open Setup and one of its sections ('Text & Fonts' | 'Outputs' | 'Settings'). */
export async function openSetup(page: Page, section: 'Text & Fonts' | 'Outputs' | 'Settings'): Promise<void> {
  await openPage(page, 'setup')
  await page.getByRole('tab', { name: section }).click()
}

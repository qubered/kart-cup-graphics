import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

export const API = 'https://www.mariowiki.com/api.php'
export const USER_AGENT = 'mk-event-graphics/1.0 (asset fetch)'
const MIN_INTERVAL_MS = 1000

let last = 0
let chain: Promise<void> = Promise.resolve()

/** Serialises all requests and spaces them at least 1s apart. */
function throttle(): Promise<void> {
  const p = chain.then(async () => {
    const wait = last + MIN_INTERVAL_MS - Date.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    last = Date.now()
  })
  chain = p.catch(() => undefined)
  return p
}

async function limitedFetch(url: string, attempts = 4): Promise<Response> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    await throttle()
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (res.ok) return res
      lastErr = new Error(`HTTP ${res.status} for ${url}`)
      if (res.status !== 429 && res.status < 500) break
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

export interface ImageInfo { url: string; thumbUrl?: string }

interface ApiPage { title: string; missing?: unknown; imageinfo?: { url: string; thumburl?: string }[] }
interface ApiResponse {
  query?: {
    normalized?: { from: string; to: string }[]
    redirects?: { from: string; to: string }[]
    pages?: Record<string, ApiPage>
  }
}

/** Titles are bare file names (without "File:"). Returns null for titles that do not exist. */
export async function queryImageInfo(
  titles: string[],
  opts: { width?: number } = {},
): Promise<Map<string, ImageInfo | null>> {
  const result = new Map<string, ImageInfo | null>()
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50)
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      redirects: '1',
      prop: 'imageinfo',
      iiprop: 'url',
      titles: batch.map((t) => `File:${t}`).join('|'),
    })
    if (opts.width) params.set('iiurlwidth', String(opts.width))
    const res = await limitedFetch(`${API}?${params}`)
    const json = (await res.json()) as ApiResponse
    const q = json.query ?? {}
    const hop = new Map<string, string>()
    for (const n of q.normalized ?? []) hop.set(n.from, n.to)
    const redir = new Map<string, string>()
    for (const r of q.redirects ?? []) redir.set(r.from, r.to)
    const byTitle = new Map<string, ApiPage>()
    for (const p of Object.values(q.pages ?? {})) byTitle.set(p.title, p)
    for (const t of batch) {
      let cur = `File:${t}`
      cur = hop.get(cur) ?? cur
      cur = redir.get(cur) ?? cur
      const page = byTitle.get(cur)
      const info = page && !page.missing ? page.imageinfo?.[0] : undefined
      result.set(t, info ? { url: info.url, thumbUrl: info.thumburl } : null)
    }
  }
  return result
}

export async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await limitedFetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  await mkdir(dirname(dest), { recursive: true })
  await writeFile(dest, buf)
}

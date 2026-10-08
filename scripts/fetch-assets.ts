import { existsSync, readFileSync } from 'node:fs'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import type { Catalog, CharacterEntry, CupEntry, TrackEntry } from '../shared/catalog.ts'
import {
  CHARACTER_SPECS, CUP_SPECS, kebab, cupEmblemTitle, trackThumbTitle, trackLargeCandidates,
} from './lib/catalog-data.ts'
import { queryImageInfo, downloadFile, type ImageInfo } from './lib/mariowiki.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS = join(ROOT, 'assets')
const overrides: Record<string, string> = existsSync(join(ASSETS, 'overrides.json'))
  ? JSON.parse(readFileSync(join(ASSETS, 'overrides.json'), 'utf8'))
  : {}

interface Job {
  key: string // output file path relative to assets/
  candidates: string[] // requested titles in priority order
  width?: number
  convert?: 'jpeg'
  required: boolean
}

const jobs: Job[] = []
const characters: CharacterEntry[] = CHARACTER_SPECS.map((s) => {
  jobs.push({ key: `characters/${s.id}.png`, candidates: s.iconCandidates, required: true })
  const e: CharacterEntry = { id: s.id, name: s.name, base: s.base, icon: `/assets/characters/${s.id}.png` }
  if (s.variant) e.variant = s.variant
  if (s.artCandidates.length) {
    jobs.push({ key: `characters/${s.id}-art.png`, candidates: s.artCandidates, width: 800, required: false })
  }
  return e
})
const tracks: TrackEntry[] = []
const cups: CupEntry[] = CUP_SPECS.map((c) => {
  jobs.push({ key: `cups/${c.id}.png`, candidates: [cupEmblemTitle(c.id)], required: true })
  const ids = c.tracks.map((name) => {
    const id = kebab(name)
    tracks.push({ id, name, cupId: c.id, thumb: `/assets/tracks/${id}.png` })
    jobs.push({ key: `tracks/${id}.png`, candidates: [trackThumbTitle(name)], required: true })
    jobs.push({ key: `tracks/${id}-large.jpg`, candidates: trackLargeCandidates(name), width: 1600, convert: 'jpeg', required: false })
    return id
  })
  return { id: c.id, name: c.name, emblem: `/assets/cups/${c.id}.png`, tracks: ids as CupEntry['tracks'] }
})

const missing: string[] = []
const resolved = new Map<string, ImageInfo>() // job.key -> info

async function resolveAll() {
  // Round r tries candidate r of every still-unresolved job; width groups queried separately.
  let pending = jobs.filter((j) => !existsSync(join(ASSETS, j.key)))
  for (let round = 0; pending.length; round++) {
    const active = pending.filter((j) => round < j.candidates.length)
    if (!active.length) break
    for (const width of [undefined, 800, 1600]) {
      const group = active.filter((j) => j.width === width)
      if (!group.length) continue
      const titles = [...new Set(group.map((j) => overrides[j.candidates[round]] ?? j.candidates[round]))]
      const info = await queryImageInfo(titles, { width })
      for (const j of group) {
        const got = info.get(overrides[j.candidates[round]] ?? j.candidates[round])
        if (got) resolved.set(j.key, got)
      }
    }
    pending = pending.filter((j) => !resolved.has(j.key))
  }
  for (const j of jobs) {
    if (!existsSync(join(ASSETS, j.key)) && !resolved.has(j.key)) {
      missing.push(`${j.required ? 'REQUIRED' : 'optional'} ${j.candidates.join(' | ')}`)
    }
  }
}

async function downloadAll() {
  for (const j of jobs) {
    const dest = join(ASSETS, j.key)
    const info = resolved.get(j.key)
    if (existsSync(dest) || !info) continue
    const url = info.thumbUrl ?? info.url
    if (j.convert === 'jpeg') {
      const tmp = dest + '.src'
      await downloadFile(url, tmp)
      await sharp(tmp).resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(dest)
      const { unlink } = await import('node:fs/promises')
      await unlink(tmp)
    } else {
      await downloadFile(url, dest)
    }
  }
}

await mkdir(ASSETS, { recursive: true })
await resolveAll()
await downloadAll()

for (const c of characters) {
  if (existsSync(join(ASSETS, 'characters', `${c.id}-art.png`))) c.art = `/assets/characters/${c.id}-art.png`
}
for (const t of tracks) {
  if (existsSync(join(ASSETS, 'tracks', `${t.id}-large.jpg`))) t.image = `/assets/tracks/${t.id}-large.jpg`
}
const missingRequired = jobs.filter((j) => j.required && !existsSync(join(ASSETS, j.key))).length
const catalog: Catalog = { characters, cups, tracks }
await writeFile(join(ASSETS, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n')
console.log(
  `catalog.json written: ${cups.length} cups, ${tracks.length} tracks, ${characters.length} characters; missing: ${missingRequired}`,
)
for (const m of missing) console.log(m)

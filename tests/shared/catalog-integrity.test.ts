import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Catalog } from '../../shared/catalog'

const ROOT = join(__dirname, '..', '..')
const catalog: Catalog = JSON.parse(readFileSync(join(ROOT, 'assets/catalog.json'), 'utf8'))
const onDisk = (p: string) => existsSync(join(ROOT, p.replace(/^\//, '')))

describe('real catalog integrity', () => {
  it('has 24 cups of 4 existing tracks and 96 tracks', () => {
    expect(catalog.cups).toHaveLength(24)
    expect(catalog.tracks).toHaveLength(96)
    const trackIds = new Set(catalog.tracks.map((t) => t.id))
    expect(trackIds.size).toBe(96)
    for (const c of catalog.cups) {
      expect(c.tracks).toHaveLength(4)
      for (const t of c.tracks) expect(trackIds.has(t), `${c.id}:${t}`).toBe(true)
    }
    for (const t of catalog.tracks) expect(catalog.cups.some((c) => c.id === t.cupId && c.tracks.includes(t.id))).toBe(true)
  })
  it('has unique character ids', () => {
    const ids = catalog.characters.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('every referenced file exists', () => {
    for (const c of catalog.characters) {
      expect(onDisk(c.icon), c.icon).toBe(true)
      if (c.art) expect(onDisk(c.art), c.art).toBe(true)
    }
    for (const c of catalog.cups) expect(onDisk(c.emblem), c.emblem).toBe(true)
    for (const t of catalog.tracks) {
      expect(onDisk(t.thumb), t.thumb).toBe(true)
      if (t.image) expect(onDisk(t.image), t.image).toBe(true)
    }
  })
})

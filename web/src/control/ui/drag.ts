// Pointer-based drag and drop (works with a finger as well as a mouse; HTML5 DnD does not).
// Usage:
//   <span class="u-grip" use:dragSource={{ kind: 'look', id: p.id, label: p.name }}><i></i></span>
//   <div use:dropZone={{ accept: ['look', 'cue'], onDrop: (payload, index) => ... }}> <div data-drop-item>...</div> ... </div>
// A zone's children marked `data-drop-item` define the insertion slots (index = number of items before the pointer).
// Set `horizontal: true` for left-to-right lists. Drop targets can also be a single box (`box: true`): index is then 0.
import type { Action } from 'svelte/action'

export interface DragPayload { kind: string; id: string; label: string }
export interface DropZoneConfig {
  accept: string[]
  onDrop: (payload: DragPayload, index: number) => void
  horizontal?: boolean
  /** The whole zone is one target (highlighted as a box) instead of an insertion line. */
  box?: boolean
}

/** Insertion index for a pointer position over a list of item rects: the number of items whose centre is before the pointer. Pure, unit-tested. */
export function insertionIndex(rects: { left: number; top: number; width: number; height: number }[], x: number, y: number, horizontal = false): number {
  let idx = 0
  rects.forEach((r, i) => {
    const centre = horizontal ? r.left + r.width / 2 : r.top + r.height / 2
    if ((horizontal ? x : y) > centre) idx = i + 1
  })
  return idx
}

const zones = new Map<HTMLElement, DropZoneConfig>()
let suppressClickUntil = 0

export const dropZone: Action<HTMLElement, DropZoneConfig> = (node, config) => {
  zones.set(node, config)
  return { update(c) { zones.set(node, c) }, destroy() { zones.delete(node) } }
}

interface Active { payload: DragPayload; x: number; y: number; on: boolean; hit: Hit | null }
interface Hit { cfg: DropZoneConfig; index: number; rect: { left: number; top: number; width: number; height: number }; box: boolean }

let active: Active | null = null
let marker: HTMLDivElement | null = null
let ghost: HTMLDivElement | null = null

function ensureChrome() {
  if (!marker) { marker = document.createElement('div'); marker.className = 'u-drop-marker'; document.body.appendChild(marker) }
  if (!ghost) { ghost = document.createElement('div'); ghost.className = 'u-drag-ghost'; document.body.appendChild(ghost) }
}

function findHit(e: PointerEvent, payload: DragPayload): Hit | null {
  for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
    const cfg = zones.get(el as HTMLElement)
    if (!cfg || !cfg.accept.includes(payload.kind)) continue
    const zr = el.getBoundingClientRect()
    if (cfg.box) return { cfg, index: 0, box: true, rect: zr }
    const items = [...el.querySelectorAll<HTMLElement>('[data-drop-item]')]
    const rects = items.map((it) => it.getBoundingClientRect())
    const index = insertionIndex(rects, e.clientX, e.clientY, cfg.horizontal)
    const h = !!cfg.horizontal
    if (!items.length) {
      return { cfg, index: 0, box: false, rect: h ? { left: zr.left + 4, top: zr.top, width: 3, height: zr.height } : { left: zr.left, top: zr.top + 4, width: zr.width, height: 3 } }
    }
    const ref = rects[Math.min(index, rects.length - 1)]
    const after = index >= rects.length
    return {
      cfg, index, box: false,
      rect: h ? { left: after ? ref.left + ref.width + 3 : ref.left - 5, top: ref.top, width: 3, height: ref.height }
        : { left: zr.left, top: after ? ref.top + ref.height - 1 : ref.top - 1, width: zr.width, height: 3 },
    }
  }
  return null
}

function onMove(e: PointerEvent) {
  const a = active
  if (!a) return
  if (!a.on) {
    if (Math.hypot(e.clientX - a.x, e.clientY - a.y) < 6) return
    a.on = true
    ensureChrome()
    ghost!.textContent = a.payload.label
    ghost!.style.display = 'block'
  }
  ghost!.style.left = `${e.clientX + 12}px`
  ghost!.style.top = `${e.clientY + 8}px`
  a.hit = findHit(e, a.payload)
  if (a.hit) {
    const r = a.hit.rect
    Object.assign(marker!.style, { display: 'block', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` })
    marker!.style.background = a.hit.box ? 'rgba(59,130,246,.22)' : ''
    marker!.style.border = a.hit.box ? '2px solid var(--ui-accent)' : ''
    marker!.style.borderRadius = a.hit.box ? '10px' : ''
  } else if (marker) marker.style.display = 'none'
}

function finish(apply: boolean) {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onCancel)
  const a = active
  active = null
  if (!a || !a.on) return
  if (marker) marker.style.display = 'none'
  if (ghost) ghost.style.display = 'none'
  suppressClickUntil = Date.now() + 40
  if (apply && a.hit) a.hit.cfg.onDrop(a.payload, a.hit.index)
}
const onUp = () => finish(true)
const onCancel = () => finish(false)

if (typeof window !== 'undefined') {
  // A drag that ends over its own source must not also "click" it.
  window.addEventListener('click', (e) => { if (Date.now() < suppressClickUntil) { e.stopPropagation(); e.preventDefault() } }, true)
}

export const dragSource: Action<HTMLElement, DragPayload> = (node, payload) => {
  let current = payload
  node.style.touchAction = 'none'
  const down = (e: PointerEvent) => {
    if (e.button !== 0 || active) return
    e.preventDefault()
    active = { payload: current, x: e.clientX, y: e.clientY, on: false, hit: null }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
  }
  node.addEventListener('pointerdown', down)
  return { update(p) { current = p }, destroy() { node.removeEventListener('pointerdown', down) } }
}

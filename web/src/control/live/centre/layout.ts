// Sizing of the monitors pane on the Live page: the operator drags the divider between the monitors and the Looks library,
// and chooses Preview and Program side by side or stacked. `null` height = automatic (the biggest the arrangement allows).
import { writable } from 'svelte/store'

const HEIGHT_KEY = 'kcg.control.monitorsHeight'
const STACK_KEY = 'kcg.control.monitorsStacked'
/** Smallest monitors pane (a label bar and a thin picture) and the room the Looks library always keeps. */
export const MIN_PANE = 120
export const MIN_LOOKS = 150
const GAP = 12
/** Vertical chrome of one monitor: the 26px label bar plus the two 2px borders. */
const CHROME = 30
const BORDER = 4

export function clampHeight(h: number, max: number): number {
  return Math.round(Math.max(MIN_PANE, Math.min(Math.max(MIN_PANE, max), h)))
}

/** Pane height when the monitors fill the column's full width: one row side by side, or two rows stacked. The divider cannot go further down than this (more would only be blank space). */
export function naturalHeight(boxW: number, aspect: number, stacked: boolean): number {
  const w = stacked ? boxW : (boxW - GAP) / 2
  const one = (w - BORDER) / aspect + CHROME
  return Math.round(stacked ? 2 * one + GAP : one)
}

/** Outer width of one monitor so the arrangement fits a pane of `boxW` x `height`, keeping the canvas aspect ratio. */
export function monitorSize(boxW: number, height: number, aspect: number, stacked: boolean): number {
  const w = stacked
    ? Math.min(boxW, ((height - GAP) / 2 - CHROME) * aspect + BORDER)
    : Math.min((boxW - GAP) / 2, (height - CHROME) * aspect + BORDER)
  return Math.max(0, Math.floor(w))
}

function loadNumber(): number | null {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(HEIGHT_KEY)
    const n = raw === null ? NaN : Number(raw)
    return Number.isFinite(n) && n >= MIN_PANE ? Math.round(n) : null
  } catch { return null }
}
function loadFlag(): boolean {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem(STACK_KEY) === '1' } catch { return false }
}

/** The chosen monitors-pane height in px, or null for the biggest the arrangement allows. Remembered in this browser. */
export const monitorsHeight = writable<number | null>(loadNumber())
monitorsHeight.subscribe((v) => {
  try {
    if (typeof localStorage === 'undefined') return
    if (v === null) localStorage.removeItem(HEIGHT_KEY)
    else localStorage.setItem(HEIGHT_KEY, String(v))
  } catch { /* private mode */ }
})
/** Preview above Program (true) or side by side (false). Remembered in this browser. */
export const monitorsStacked = writable<boolean>(loadFlag())
monitorsStacked.subscribe((v) => {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(STACK_KEY, v ? '1' : '0') } catch { /* private mode */ }
})

// Sizing of the monitors pane on the Live page: the operator drags the divider between the monitors and the Looks library.
// `null` = automatic (Preview and Program side by side at the column's full width, as before).
import { writable } from 'svelte/store'

const KEY = 'kcg.control.monitorsHeight'
/** Smallest monitors pane (about a label bar and a thin picture) and the room the Looks library always keeps. */
export const MIN_PANE = 120
export const MIN_LOOKS = 150
const GAP = 12
/** Vertical chrome of one monitor: the 26px label bar plus the two 2px borders. */
const CHROME = 30
const BORDER = 4

export function clampHeight(h: number, max: number): number {
  return Math.round(Math.max(MIN_PANE, Math.min(Math.max(MIN_PANE, max), h)))
}

/** Largest size (outer width of one monitor, side by side or stacked) that fits a box of `boxW` x `height`, keeping the canvas aspect ratio. Whichever arrangement gives the bigger picture wins, so dragging the divider down turns a wide output from two small monitors into two big stacked ones. */
export function monitorSize(boxW: number, height: number, aspect: number): { stacked: boolean; w: number } {
  const side = Math.max(0, Math.min((boxW - GAP) / 2, (height - CHROME) * aspect + BORDER))
  const stack = Math.max(0, Math.min(boxW, ((height - GAP) / 2 - CHROME) * aspect + BORDER))
  return stack > side ? { stacked: true, w: Math.floor(stack) } : { stacked: false, w: Math.floor(side) }
}

function load(): number | null {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY)
    const n = raw === null ? NaN : Number(raw)
    return Number.isFinite(n) && n >= MIN_PANE ? Math.round(n) : null
  } catch { return null }
}

/** The chosen monitors-pane height in px, or null for automatic. Remembered in this browser. */
export const monitorsHeight = writable<number | null>(load())
monitorsHeight.subscribe((v) => {
  try {
    if (typeof localStorage === 'undefined') return
    if (v === null) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, String(v))
  } catch { /* private mode */ }
})

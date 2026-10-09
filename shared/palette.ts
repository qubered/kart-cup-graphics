import type { ColourId } from './types'
export type { ColourId }

export const PLAYER_COLOURS: { id: ColourId; name: string; hex: string }[] = [
  { id: 'red', name: 'Red', hex: '#e60012' },
  { id: 'blue', name: 'Blue', hex: '#1e6cff' },
  { id: 'green', name: 'Green', hex: '#22b14c' },
  { id: 'yellow', name: 'Yellow', hex: '#ffc400' },
  { id: 'pink', name: 'Pink', hex: '#ff5fa2' },
  { id: 'orange', name: 'Orange', hex: '#ff8a00' },
  { id: 'purple', name: 'Purple', hex: '#8b5cf6' },
  { id: 'cyan', name: 'Cyan', hex: '#06b6d4' },
]

export function colourHex(id: ColourId): string {
  return (PLAYER_COLOURS.find((c) => c.id === id) ?? PLAYER_COLOURS[0]).hex
}

export function textOn(id: ColourId): '#ffffff' | '#14213d' {
  return id === 'yellow' || id === 'cyan' ? '#14213d' : '#ffffff'
}

/** Mix a #rrggbb colour toward another (`t` 0..1) and return #rrggbb. Chromium 103 (Millumin) has no color-mix(), so shades are computed. */
export function mixHex(hex: string, to: string, t: number): string {
  const a = parseInt(hex.slice(1), 16)
  const b = parseInt(to.slice(1), 16)
  const ch = (sh: number) => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t)
  return `#${[16, 8, 0].map((sh) => ch(sh).toString(16).padStart(2, '0')).join('')}`
}

// Tone-on-tone icon tile for Background B (1250x280). Nine icons, drawn as simple strokes/fills.
export const TILE_W = 1250
export const TILE_H = 280
export const TILE_BG = '#0553a6'
export const TILE_INK = '#03458f'

const STROKE = `fill="none" stroke="${TILE_INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"`
const FILL = `fill="${TILE_INK}"`

// Each icon is drawn in a -50..50 box around its origin.
const ICONS: Record<string, string> = {
  wheel: `<circle r="42" ${STROKE}/><circle r="13" ${STROKE}/><path d="M0 -13V-42M11 6l36 21M-11 6l-36 21" ${STROKE}/>`,
  shield8: `<path d="M-38 -44H38V6C38 28 18 42 0 50C-18 42 -38 28 -38 6Z" ${STROKE}/><circle cx="0" cy="-14" r="11" ${STROKE}/><circle cx="0" cy="12" r="14" ${STROKE}/>`,
  sign: `<path d="M0 -50L50 0L0 50L-50 0Z" ${STROKE}/><path d="M0 -24V8" ${STROKE}/><circle cx="0" cy="26" r="4" ${FILL}/>`,
  tyres: `<ellipse cx="0" cy="22" rx="42" ry="22" ${STROKE}/><ellipse cx="0" cy="-6" rx="42" ry="22" ${STROKE}/><ellipse cx="0" cy="-6" rx="16" ry="8" ${STROKE}/>`,
  speedo: `<path d="M-46 26A46 46 0 1 1 46 26" ${STROKE}/><path d="M0 18L22 -22" ${STROKE}/><circle cx="0" cy="18" r="6" ${FILL}/><path d="M-30 26H30" ${STROKE}/>`,
  star: `<path d="M0 -50L14 -16L50 -14L22 10L32 46L0 26L-32 46L-22 10L-50 -14L-14 -16Z" ${STROKE}/>`,
  mushroom: `<path d="M-48 4C-48 -30 -26 -48 0 -48C26 -48 48 -30 48 4Z" ${STROKE}/><path d="M-26 4V34C-26 44 -14 48 0 48C14 48 26 44 26 34V4" ${STROKE}/><circle cx="-4" cy="-24" r="8" ${FILL}/>`,
  itembox: `<rect x="-42" y="-42" width="84" height="84" rx="12" ${STROKE}/><path d="M-12 -14C-12 -32 14 -32 14 -14C14 -4 0 -4 0 8" ${STROKE}/><circle cx="0" cy="26" r="4.5" ${FILL}/>`,
  flag: `<path d="M-34 50V-50" ${STROKE}/><path d="M-34 -48H44V8H-34Z" ${STROKE}/><path d="M-12 -48V8M10 -48V8M-34 -20H44" ${STROKE}/><rect x="-34" y="-48" width="22" height="28" ${FILL}/><rect x="10" y="-48" width="22" height="28" ${FILL}/><rect x="-12" y="-20" width="22" height="28" ${FILL}/><rect x="32" y="-20" width="12" height="28" ${FILL}/>`,
}

// Staggered placement across the tile; x spacing 1250/9, alternating rows so the pattern isn't a straight line.
const PLACEMENT: { icon: keyof typeof ICONS; x: number; y: number; r: number; s: number }[] = [
  { icon: 'wheel', x: 70, y: 100, r: 0, s: 1 },
  { icon: 'shield8', x: 208, y: 190, r: -8, s: 0.95 },
  { icon: 'sign', x: 347, y: 90, r: 8, s: 0.9 },
  { icon: 'tyres', x: 486, y: 196, r: 0, s: 0.95 },
  { icon: 'speedo', x: 625, y: 96, r: -6, s: 1 },
  { icon: 'star', x: 764, y: 192, r: 12, s: 0.9 },
  { icon: 'mushroom', x: 903, y: 94, r: -10, s: 1 },
  { icon: 'itembox', x: 1042, y: 190, r: 10, s: 0.9 },
  { icon: 'flag', x: 1181, y: 98, r: 6, s: 0.95 },
]

export function tileSvg(): string {
  const body = PLACEMENT.map(p => `<g transform="translate(${p.x} ${p.y}) rotate(${p.r}) scale(${p.s})">${ICONS[p.icon]}</g>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${TILE_H}" viewBox="0 0 ${TILE_W} ${TILE_H}">${body}</svg>`
}

export function tileDataUri(): string {
  return `url("data:image/svg+xml,${encodeURIComponent(tileSvg())}")`
}

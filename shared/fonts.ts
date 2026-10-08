export const BUNDLED_FONTS: string[] = [
  'Rubik', 'Exo 2', 'Saira', 'Roboto', 'Lexend Zetta', 'Titan One', 'Lilita One', 'Russo One', 'Baloo 2', 'Luckiest Guy', 'Mario Kart F2',
]

export function fontStack(family: string): string {
  if (family === 'Mario Kart F2') return '"MK F2","Lexend Zetta",sans-serif'
  return `"${family}","Rubik",sans-serif`
}

const UPRIGHT = new Set(['Mario Kart F2', 'Lexend Zetta', 'Titan One', 'Luckiest Guy', 'Lilita One', 'Russo One'])
export function isUpright(family: string): boolean {
  return UPRIGHT.has(family)
}

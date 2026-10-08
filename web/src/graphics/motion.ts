import type { TakeMode, TransitionSpeed } from '../../../shared/types'

export const SPEED_MS: Record<TransitionSpeed, number> = { fast: 300, normal: 500, slow: 900 }
export const STAGGER_MS = 80
export const EASING = 'cubic-bezier(.24,.63,.38,1.22)'

export function enterDuration(mode: TakeMode, speed: TransitionSpeed): number {
  return mode === 'cut' ? 0 : SPEED_MS[speed]
}
export function exitDuration(mode: TakeMode, speed: TransitionSpeed): number {
  return Math.round(enterDuration(mode, speed) * 0.6)
}

const X1 = 0.24, Y1 = 0.63, X2 = 0.38, Y2 = 1.22
const bez = (t: number, a: number, b: number) =>
  3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t

/** cubic-bezier(.24,.63,.38,1.22) solved for x -> y. */
export function overshoot(x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  let lo = 0, hi = 1
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (bez(mid, X1, X2) < x) lo = mid
    else hi = mid
  }
  return bez((lo + hi) / 2, Y1, Y2)
}

export interface TransitionConfig {
  delay?: number
  duration?: number
  easing?: (t: number) => number
  css?: (t: number, u: number) => string
}

export function pop(_node: Element, p: { duration: number; delay?: number }): TransitionConfig {
  return {
    duration: p.duration,
    delay: p.delay ?? 0,
    easing: overshoot,
    css: (t) => `transform: scale(${0.6 + 0.4 * t}); opacity: ${Math.min(1, t * 2)}`,
  }
}

export function slideIn(
  _node: Element,
  p: { duration: number; delay?: number; dx?: number },
): TransitionConfig {
  const dx = p.dx ?? -80
  return {
    duration: p.duration,
    delay: p.delay ?? 0,
    easing: overshoot,
    css: (t, u) => `transform: translateX(${dx * u}px); opacity: ${Math.min(1, t * 2)}`,
  }
}

import { cubicIn, cubicOut } from 'svelte/easing'

export interface TransitionConfig {
  delay?: number
  duration?: number
  easing?: (t: number) => number
  css?: (t: number, u: number) => string
}

/** Medallion coin flip: rotates around Y (transform + opacity only). */
export function flipIn(_node: Element, p: { duration: number; delay?: number }): TransitionConfig {
  return {
    duration: p.duration,
    delay: (p.delay ?? 0) + p.duration * 0.35,
    easing: cubicOut,
    css: (t, u) => `transform: perspective(600px) rotateY(${-90 * u}deg); opacity: ${t > 0.02 ? 1 : 0}`,
  }
}
export function flipOut(_node: Element, p: { duration: number }): TransitionConfig {
  return {
    duration: p.duration * 0.35,
    easing: cubicIn,
    css: (t, u) => `transform: perspective(600px) rotateY(${90 * u}deg); opacity: ${t > 0.02 ? 1 : 0}`,
  }
}

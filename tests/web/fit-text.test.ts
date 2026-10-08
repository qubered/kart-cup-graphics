import { afterEach, describe, expect, it, vi } from 'vitest'
import { fitText } from '../../web/src/lib/fit-text'

/** Fake DOM: text width = chars * fontSize * 0.5 px; the span's transform doesn't affect scrollWidth (reset before measuring). */
function fake(chars: number, baseFs: number, withSpan: boolean) {
  const style = { fontSize: `${baseFs}px`, display: '' } as Record<string, string>
  const span = { style: { transform: '', display: '', transformOrigin: '' } as Record<string, string>, get offsetWidth() { return chars * parseFloat(style.fontSize) * 0.5 } }
  const node = {
    style,
    get scrollWidth() { return chars * parseFloat(style.fontSize) * 0.5 },
    querySelector: () => (withSpan ? span : null),
  }
  return { node: node as unknown as HTMLElement, span, style }
}
vi.stubGlobal('getComputedStyle', (n: { style: Record<string, string> }) => ({ fontSize: n.style.fontSize, display: 'block' }))
vi.stubGlobal('document', { fonts: { ready: Promise.resolve() } })
vi.stubGlobal('MutationObserver', undefined)
afterEach(() => vi.clearAllMocks())

describe('fitText', () => {
  it('leaves text that fits alone', () => {
    const f = fake(10, 100, true)
    fitText(f.node, { max: 600 })
    expect(f.style.fontSize).toBe('100px')
    expect(f.span.style.transform).toBe('')
  })
  it('shrinks the font above the floor without scaling', () => {
    const f = fake(10, 100, true) // width 500 at 100px
    fitText(f.node, { max: 350 })
    expect(parseFloat(f.style.fontSize)).toBe(70)
    expect(f.span.style.transform).toBe('')
  })
  it('stops at the default 60% floor then scaleX the span', () => {
    const f = fake(10, 100, true)
    fitText(f.node, { max: 150 }) // 60px -> 300 wide
    expect(parseFloat(f.style.fontSize)).toBe(60)
    expect(f.span.style.transform).toBe('scaleX(0.5000)')
  })
  it('minRatio 0 never scales', () => {
    const f = fake(10, 100, true)
    fitText(f.node, { max: 150, minRatio: 0 })
    expect(parseFloat(f.style.fontSize)).toBeLessThanOrEqual(30)
    expect(f.span.style.transform).toBe('')
  })
  it('re-runs on update and falls back to the node without a span', () => {
    const f = fake(10, 100, false)
    const a = fitText(f.node, { max: 600 })
    expect(f.style.fontSize).toBe('100px')
    a.update({ max: 150 })
    expect(parseFloat(f.style.fontSize)).toBe(60)
    expect(f.style.transform).toBe('scaleX(0.5000)')
  })
})

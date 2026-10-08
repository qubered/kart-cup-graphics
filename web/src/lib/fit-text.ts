export interface FitTextParams {
  /** Maximum width in px. */
  max: number
  /** Font-size floor as a fraction of the base size (default 0.6; 0 = no floor). */
  minRatio?: number
  /** Optional: any changing value re-runs the fit. */
  text?: string
}

/**
 * Same rule as `fitText` in docs/mockups/shared/mockup.js:
 * 1) shrink font-size 1px at a time down to `minRatio` x the base size,
 * 2) if it still overflows, `scaleX(max / width)` the inner `<span>` (or the node itself when it has none).
 * Fitted elements wrap their text in a `<span>` (`[data-fit] > span { display:inline-block; transform-origin:left center }`).
 */
export function fitText(node: HTMLElement, p: FitTextParams) {
  let params = p
  let base = ''
  let running = false
  const target = (): HTMLElement => (node.querySelector(':scope > span') as HTMLElement | null) ?? node
  const run = () => {
    if (running) return
    running = true
    try {
      const span = target()
      span.style.transform = ''
      node.style.fontSize = base
      if (!node.style.display) node.style.display = 'inline-block'
      if (span !== node) span.style.display = span.style.display || 'inline-block'
      const baseSize = parseFloat(getComputedStyle(node).fontSize)
      if (!baseSize || !params.max) return
      const ratio = params.minRatio ?? 0.6
      const floor = Math.max(8, baseSize * ratio)
      let fs = baseSize
      let guard = 2000
      while (node.scrollWidth > params.max && fs > floor && guard-- > 0) {
        fs -= 1
        node.style.fontSize = `${fs}px`
      }
      const w = span === node ? node.scrollWidth : span.offsetWidth
      if (node.scrollWidth > params.max && w > 0) {
        span.style.transformOrigin = 'left center'
        span.style.transform = `scaleX(${(params.max / w).toFixed(4)})`
      }
    } finally {
      running = false
    }
  }
  const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(run) : null
  mo?.observe(node, { characterData: true, childList: true, subtree: true })
  base = node.style.fontSize
  run()
  void document.fonts?.ready.then(run)
  return {
    update(np: FitTextParams) {
      params = np
      run()
    },
    destroy() {
      mo?.disconnect()
    },
  }
}

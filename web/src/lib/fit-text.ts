export interface FitTextParams {
  /** Maximum width in px. */
  max: number
  /** Font-size floor as a fraction of the base size (default 0.6; 0 = no floor). */
  minRatio?: number
  /** Allow a name with spaces to wrap onto up to this many lines (e.g. first / last name) when one line would have to shrink a lot. Default 1. */
  lines?: number
  /** Optional: any changing value re-runs the fit. */
  text?: string
  /** Called after every fit with the resulting font-size in px (used to equalise grouped lines). */
  onFit?: (fontSize: number) => void
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
  let wrapped = false
  const target = (): HTMLElement => (node.querySelector(':scope > span') as HTMLElement | null) ?? node
  const run = () => {
    if (running) return
    running = true
    try {
      const span = target()
      span.style.transform = ''
      if (wrapped) { wrapped = false; node.style.whiteSpace = ''; span.style.whiteSpace = ''; span.style.display = 'inline-block' }
      node.style.fontSize = base
      if (getComputedStyle(node).display === 'inline') node.style.display = 'inline-block'
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
      const lines = params.lines ?? 1
      if (lines > 1 && span !== node && /\s/.test(span.textContent ?? '') && fs < baseSize * 0.8) {
        // Try stacking the words instead of squeezing one line: keep it when it lets the text stay clearly bigger.
        const oneLine = fs
        const lh = (parseFloat(getComputedStyle(node).lineHeight) || fs * 1.05) / fs
        wrapped = true
        node.style.whiteSpace = 'normal'; span.style.whiteSpace = 'normal'; span.style.display = 'block'
        let ws = baseSize
        node.style.fontSize = `${ws}px`
        const over = () => node.scrollWidth > params.max || node.scrollHeight > ws * lh * (lines + 0.2)
        let g = 2000
        while (over() && ws > floor && g-- > 0) { ws -= 1; node.style.fontSize = `${ws}px` }
        if (over() || ws < oneLine * 1.15) {
          wrapped = false
          node.style.whiteSpace = ''; span.style.whiteSpace = ''; span.style.display = 'inline-block'
          node.style.fontSize = `${oneLine}px`
        } else fs = ws
      }
      const w = span === node ? node.scrollWidth : span.offsetWidth
      if (node.scrollWidth > params.max && w > 0) {
        span.style.transformOrigin = 'left center'
        span.style.transform = `scaleX(${(params.max / w).toFixed(4)})`
      }
    } finally {
      running = false
    }
    params.onFit?.(parseFloat(node.style.fontSize || getComputedStyle(node).fontSize))
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

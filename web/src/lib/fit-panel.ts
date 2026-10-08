export interface FitPanelParams {
  /** Base text size in px (the --fs variable). */
  size: number
  /** The panel may not grow taller than this. */
  maxH: number
  /** Any changing value re-runs the fit (e.g. the text). */
  text?: string
}

/** Shrinks a panel's `--fs` (1px at a time, down to 45% of the base) until the panel fits `maxH`, so long text never overruns its box. */
export function fitPanel(node: HTMLElement, p: FitPanelParams) {
  const run = (q: FitPanelParams) => {
    let fs = q.size
    node.style.setProperty('--fs', `${fs}px`)
    const floor = Math.max(10, q.size * 0.45)
    let guard = 400
    while (node.offsetHeight > q.maxH && fs > floor && guard-- > 0) {
      fs -= 1
      node.style.setProperty('--fs', `${fs}px`)
    }
  }
  run(p)
  void document.fonts?.ready.then(() => run(p))
  let cur = p
  return { update(q: FitPanelParams) { cur = q; run(q) }, destroy() { void cur } }
}

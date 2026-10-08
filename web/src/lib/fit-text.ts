export interface FitTextParams { max: number; text?: string }

/** Reduces font-size until scrollWidth <= max. Pass `text` (or any changing value) to re-run on change. */
export function fitText(node: HTMLElement, p: FitTextParams) {
  let params = p
  let base = ''
  const run = () => {
    node.style.fontSize = base
    node.style.display = node.style.display || 'inline-block'
    let size = parseFloat(getComputedStyle(node).fontSize)
    if (!size) return
    let guard = 60
    while (node.scrollWidth > params.max && size > 6 && guard-- > 0) {
      size = Math.max(6, size * Math.min(0.95, params.max / node.scrollWidth))
      node.style.fontSize = `${size}px`
    }
  }
  const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(run) : null
  mo?.observe(node, { characterData: true, childList: true, subtree: true })
  const start = () => {
    base = node.style.fontSize
    run()
  }
  start()
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

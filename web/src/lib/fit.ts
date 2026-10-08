export interface FitParams { width: number; height: number }

/** Scales the first child so a fixed width x height box fits the node's width. */
export function fit(node: HTMLElement, p: FitParams) {
  let params = p
  const apply = () => {
    const child = node.firstElementChild as HTMLElement | null
    if (!child) return
    const w = node.clientWidth || params.width
    const s = w / params.width
    child.style.transformOrigin = '0 0'
    child.style.transform = `scale(${s})`
    node.style.height = `${params.height * s}px`
  }
  apply()
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null
  ro?.observe(node)
  return {
    update(np: FitParams) {
      params = np
      apply()
    },
    destroy() {
      ro?.disconnect()
    },
  }
}

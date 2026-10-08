/** Keeps an input's value in sync with state without clobbering text while the user is typing. */
export function sync(node: HTMLInputElement | HTMLTextAreaElement, value: string | number) {
  const set = (v: string | number) => {
    if (document.activeElement !== node && node.value !== String(v)) node.value = String(v)
  }
  node.value = String(value)
  return { update: set }
}

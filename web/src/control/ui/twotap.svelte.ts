// Two-tap guard for destructive or overwriting actions (replaces confirm()). The first tap arms a key for a few seconds
// (render the button as `.confirm` with its "tap again" label while `armed === key`); the second tap runs the action.
export function twoTap(ms = 3500) {
  let key = $state<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    get armed() { return key },
    tap(k: string, action: () => void) {
      clearTimeout(timer)
      if (key === k) { key = null; action(); return }
      key = k
      timer = setTimeout(() => { key = null }, ms)
    },
    reset() { clearTimeout(timer); key = null },
  }
}

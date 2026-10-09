<script lang="ts">
  // Horizontal divider between the monitors and the Looks library. Drag (mouse or finger), arrow keys, double-click or Esc to go back to automatic.
  import { MIN_PANE } from './layout'

  let { value, max, natural, onchange }: {
    /** Current pane height in px, or null for automatic. */
    value: number | null
    /** Largest pane height that still leaves the Looks library its minimum. */
    max: () => number
    /** The pane's current rendered height (the starting point when the value is automatic). */
    natural: () => number
    onchange: (v: number | null) => void
  } = $props()

  let dragging = $state(false)
  let startY = 0
  let startH = 0

  const current = () => value ?? natural()
  function down(e: PointerEvent) {
    if (e.button !== 0) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    ;(e.currentTarget as HTMLElement).focus()
    startY = e.clientY
    startH = current()
    dragging = true
  }
  function move(e: PointerEvent) {
    if (dragging) onchange(startH + (e.clientY - startY))
  }
  function up() { dragging = false }
  function key(e: KeyboardEvent) {
    const step = e.shiftKey ? 60 : 20
    // Only the keys this control uses are swallowed: Space, Enter, H, G and the number keys keep working for the show.
    if (e.key === 'ArrowUp') onchange(current() - step)
    else if (e.key === 'ArrowDown') onchange(current() + step)
    else if (e.key === 'Home') onchange(MIN_PANE)
    else if (e.key === 'End') onchange(max())
    else if (e.key === 'Escape') onchange(null)
    else return
    e.preventDefault()
    e.stopPropagation()
  }
</script>

<div class="split" class:on={dragging} role="separator" aria-orientation="horizontal" tabindex="0" data-splitter
  aria-label="Resize the monitors and the Looks library. Drag, or use the up and down arrow keys. Double-click or Esc resets."
  aria-valuemin={MIN_PANE} aria-valuemax={Math.round(max())} aria-valuenow={value ?? Math.round(natural())}
  title="Drag to resize · double-click to reset"
  onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} onkeydown={key} ondblclick={() => onchange(null)}>
  <i></i>
</div>

<style>
  .split { height: 14px; margin: -6px 0; display: grid; place-items: center; cursor: row-resize; touch-action: none; border-radius: 6px; flex: none; position: relative; z-index: 2; }
  .split i { display: block; width: 56px; height: 4px; border-radius: 2px; background: #3a4455; }
  .split:hover i, .split:focus-visible i, .split.on i { background: var(--ui-accent); }
  .split:focus-visible { outline: 2px solid var(--ui-accent); outline-offset: 0; }
</style>

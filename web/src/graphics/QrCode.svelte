<script lang="ts">
  import qrcode from 'qrcode-generator'

  /** One QR design for every code: dot modules, rounded finder squares, white rounded card. Only `value` differs. */
  let { value, size }: { value: string; size: number } = $props()

  const QUIET = 2
  const FINDER = 7

  const geo = $derived.by(() => {
    const q = qrcode(0, 'Q')
    q.addData(value || ' ')
    q.make()
    const n = q.getModuleCount()
    const inFinder = (r: number, c: number) => (r < FINDER && (c < FINDER || c >= n - FINDER)) || (r >= n - FINDER && c < FINDER)
    let dots = ''
    const rad = 0.45
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (inFinder(r, c) || !q.isDark(r, c)) continue
        const cx = c + QUIET + 0.5, cy = r + QUIET + 0.5
        dots += `M${cx - rad} ${cy}a${rad} ${rad} 0 1 0 ${2 * rad} 0a${rad} ${rad} 0 1 0 ${-2 * rad} 0`
      }
    }
    const finders = [[0, 0], [0, n - FINDER], [n - FINDER, 0]].map(([r, c]) => ({ x: c + QUIET, y: r + QUIET }))
    return { total: n + QUIET * 2, finders, dots }
  })
</script>

<svg width={size} height={size} viewBox="0 0 {geo.total} {geo.total}" role="img" aria-label="QR code" shape-rendering="geometricPrecision">
  <rect width={geo.total} height={geo.total} rx="1.6" fill="#fff" />
  <path d={geo.dots} fill="#000" />
  {#each geo.finders as f (`${f.x},${f.y}`)}
    <rect x={f.x + 0.5} y={f.y + 0.5} width="6" height="6" rx="1.6" fill="none" stroke="#000" stroke-width="1" />
    <rect x={f.x + 2} y={f.y + 2} width="3" height="3" rx="0.8" fill="#000" />
  {/each}
</svg>

<script lang="ts">
  import QrCode from './QrCode.svelte'

  /** A QR code with its label pill under it, tilted a little (odd/even `tilt` leans opposite ways). Text size comes from the parent's --fs. */
  let { value, label, size, tilt = 0 }: { value: string; label: string; size: number; tilt?: number } = $props()
</script>

<figure style:--qr="{size}px" style:--tilt="{tilt % 2 ? 2.5 : -2.5}deg">
  <QrCode {value} {size} />
  <figcaption>{label}</figcaption>
</figure>

<style>
  figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: calc(var(--qr) * .09); flex: none; }
  figure :global(svg) { border-radius: calc(var(--qr) * .07); filter: drop-shadow(0 calc(var(--qr) * .03) 0 rgba(0, 0, 0, .4)); transform: rotate(var(--tilt)); }
  /* label pill, same look as the title's pre-title pill */
  figcaption {
    background: var(--mk-pill); color: var(--mk-navy); font-size: var(--fs); font-weight: 900; font-style: italic; line-height: 1; letter-spacing: .04em;
    padding: .3em 1em; border-radius: .25em; transform: skewX(-14deg); box-shadow: 0 .18em 0 var(--mk-pill-shadow);
  }
</style>

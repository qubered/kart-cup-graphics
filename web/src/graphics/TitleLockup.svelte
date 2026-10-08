<script lang="ts">
  import type { OutputFormat, TitleView } from '../../../shared/types'
  import { fitText } from '../lib/fit-text'
  import { TITLE_LAYOUT, breakTitle } from './title-layout'

  interface Props {
    title: TitleView
    style: 'chrome' | 'classic'
    format: OutputFormat
    /** Event-title font stack. */
    font: string
    /** Label font stack (pre-title pill). */
    labelFont: string
    /** Vertical centre; defaults to the format's title-scene value. */
    top?: string
  }
  let { title, style, format, font, labelFont, top }: Props = $props()

  const cfg = $derived(TITLE_LAYOUT[format])
  let fontsTick = $state(0)
  $effect(() => {
    const f = document.fonts
    if (!f) return
    void f.load(`900 100px ${font}`).then(() => fontsTick++).catch(() => {})
    void f.ready.then(() => fontsTick++)
  })

  let ctx: CanvasRenderingContext2D | null = null
  const measure = (t: string) => {
    ctx ??= document.createElement('canvas').getContext('2d')
    if (!ctx) return t.length * 60
    ctx.font = `900 100px ${font}`
    return ctx.measureText(t).width
  }
  const broken = $derived.by(() => {
    void fontsTick
    return breakTitle(title.title, title.accent, cfg, measure)
  })
  const lines = $derived(
    cfg.layout === 'line'
      ? [{ m: title.title, a: title.accent }]
      : [...broken.lines.map((m) => ({ m, a: '' })), ...(broken.accentLine ? [{ m: '', a: title.accent }] : [])],
  )
  const px = $derived(cfg.layout === 'line' ? cfg.ts : Math.floor(broken.size))

  // Every line is fitted without a floor, then all lines take the smallest fitted size.
  let box: HTMLElement | undefined = $state()
  const natural: (number | undefined)[] = []
  const equalise = (i: number, fs: number) => {
    natural[i] = fs
    if (!box) return
    const els = Array.from(box.querySelectorAll<HTMLElement>('.ln'))
    const known = els.map((_, k) => natural[k]).filter((v): v is number => typeof v === 'number')
    if (known.length < els.length) return
    const min = Math.min(...known)
    for (const el of els) el.style.fontSize = `${min}px`
  }
</script>

<div class="title-lockup" data-style={style} data-layout={cfg.layout} style:--ts="{cfg.ts}px" style:--ps="{cfg.ps}px" style:top={top ?? cfg.top}>
  {#if title.preTitle}
    <div class="pre" style:font-family={labelFont}>{title.preTitle}</div>
  {/if}
  <div class="lines" bind:this={box}>
    {#each lines as ln, i (`${i}:${ln.m}|${ln.a}`)}
      <div
        class="ln"
        data-t={[ln.m, ln.a].filter(Boolean).join(' ')}
        style:--ln="{px}px"
        style:font-family={font}
        use:fitText={{ max: cfg.max, minRatio: 0, text: `${ln.m}|${ln.a}|${px}|${font}`, onFit: (fs) => equalise(i, fs) }}
      ><span>{#if ln.m}<span class="m">{ln.m}</span>{/if} {#if ln.a}<span class="a">{ln.a}</span>{/if}</span></div>
    {/each}
  </div>
</div>

<style>
  .title-lockup { position: absolute; left: 50%; transform: translate(-50%, -50%); text-align: center; white-space: nowrap; z-index: 5; }
  .pre {
    display: inline-block; background: var(--mk-pill); color: var(--mk-navy); font-style: italic; font-weight: 800; font-size: var(--ps); line-height: 1;
    padding: calc(var(--ps) * .28) calc(var(--ps) * .97); transform: skewX(-14deg); border-radius: calc(var(--ps) * .2);
    box-shadow: 0 calc(var(--ps) * .17) 0 var(--mk-pill-shadow); letter-spacing: 2px;
  }
  .lines { margin-top: calc(var(--ts) * .19); }
  .ln { position: relative; display: block; width: max-content; margin: 0 auto; padding: 0 .14em; font-weight: 900; font-size: var(--ln); line-height: 1.1; white-space: nowrap; z-index: 1; }
  .ln + .ln { margin-top: .06em; }
  .ln > span { display: inline-block; transform-origin: left center; white-space: nowrap; }
  .ln::before {
    content: attr(data-t); position: absolute; left: .14em; top: 0; z-index: -1;
    /* outline = ring of 24 text-shadows (radius = half the .143em stroke): -webkit-text-stroke mitres sharp corners into spikes */
    color: var(--oc); text-shadow: 0.0715em 0.0000em 0 var(--oc), 0.0691em 0.0185em 0 var(--oc), 0.0619em 0.0357em 0 var(--oc), 0.0506em 0.0506em 0 var(--oc), 0.0358em 0.0619em 0 var(--oc), 0.0185em 0.0691em 0 var(--oc), 0.0000em 0.0715em 0 var(--oc), -0.0185em 0.0691em 0 var(--oc), -0.0357em 0.0619em 0 var(--oc), -0.0506em 0.0506em 0 var(--oc), -0.0619em 0.0357em 0 var(--oc), -0.0691em 0.0185em 0 var(--oc), -0.0715em 0.0000em 0 var(--oc), -0.0691em -0.0185em 0 var(--oc), -0.0619em -0.0357em 0 var(--oc), -0.0506em -0.0506em 0 var(--oc), -0.0358em -0.0619em 0 var(--oc), -0.0185em -0.0691em 0 var(--oc), -0.0000em -0.0715em 0 var(--oc), 0.0185em -0.0691em 0 var(--oc), 0.0358em -0.0619em 0 var(--oc), 0.0506em -0.0506em 0 var(--oc), 0.0619em -0.0358em 0 var(--oc), 0.0691em -0.0185em 0 var(--oc);
  }
  [data-style='chrome'] .ln::before { --oc: var(--mk-ink); filter: drop-shadow(0 .095em 0 var(--chrome-drop)); }
  [data-style='chrome'] .m { background: var(--chrome); -webkit-background-clip: text; background-clip: text; color: transparent; }
  [data-style='chrome'] .a { background: var(--iridescent); -webkit-background-clip: text; background-clip: text; color: transparent; }
  [data-style='classic'] .ln { color: #fff; }
  [data-style='classic'] .ln::before { --oc: var(--mk-navy); filter: drop-shadow(0 .105em 0 var(--mk-navy)); }
  [data-style='classic'] .a { color: var(--mk-pill); }
</style>

<script lang="ts">
  let { text, accent = '', look, font, upright, size }: {
    text: string; accent?: string; look: 'chrome' | 'classic' | 'plain'; font: string; upright: boolean; size: number
  } = $props()
</script>

<span
  class="heading"
  class:upright
  data-look={look}
  data-t={accent ? `${text} ${accent}` : text}
  style:font-family={font}
  style:--hs="{size}px"
><span class="m">{text}</span>{#if accent} <span class="a">{accent}</span>{/if}</span>

<style>
  .heading { position: relative; display: inline-block; font-style: italic; font-weight: 900; font-size: var(--hs, 120px); line-height: 1.1; white-space: nowrap; z-index: 1; }
  .heading.upright { font-style: normal; }
  .heading::before {
    content: attr(data-t); position: absolute; left: 0; top: 0; z-index: -1;
    /* outline = ring of 24 text-shadows (radius = half the .183em stroke), so no mitre spikes */
    color: var(--oc); text-shadow: 0.0915em 0.0000em 0 var(--oc), 0.0884em 0.0237em 0 var(--oc), 0.0792em 0.0457em 0 var(--oc), 0.0647em 0.0647em 0 var(--oc), 0.0458em 0.0792em 0 var(--oc), 0.0237em 0.0884em 0 var(--oc), 0.0000em 0.0915em 0 var(--oc), -0.0237em 0.0884em 0 var(--oc), -0.0457em 0.0792em 0 var(--oc), -0.0647em 0.0647em 0 var(--oc), -0.0792em 0.0457em 0 var(--oc), -0.0884em 0.0237em 0 var(--oc), -0.0915em 0.0000em 0 var(--oc), -0.0884em -0.0237em 0 var(--oc), -0.0792em -0.0457em 0 var(--oc), -0.0647em -0.0647em 0 var(--oc), -0.0458em -0.0792em 0 var(--oc), -0.0237em -0.0884em 0 var(--oc), -0.0000em -0.0915em 0 var(--oc), 0.0237em -0.0884em 0 var(--oc), 0.0458em -0.0792em 0 var(--oc), 0.0647em -0.0647em 0 var(--oc), 0.0792em -0.0458em 0 var(--oc), 0.0884em -0.0237em 0 var(--oc);
  }
  .heading[data-look='classic'] { color: #fff; }
  .heading[data-look='classic']::before { --oc: var(--mk-navy); filter: drop-shadow(0 .117em 0 var(--mk-navy)); }
  .heading[data-look='classic'] .a { color: var(--mk-pill); }
  .heading[data-look='chrome']::before { --oc: var(--mk-ink); filter: drop-shadow(0 .117em 0 var(--chrome-drop)); }
  .heading[data-look='chrome'] .m { background: var(--chrome); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .heading[data-look='chrome'] .a { background: var(--iridescent); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .heading[data-look='plain'] { color: #fff; text-shadow: 0 8px 24px rgba(0, 0, 0, .45); }
  .heading[data-look='plain']::before { display: none; }
</style>

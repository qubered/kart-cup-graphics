<script lang="ts">
  let { text, accent = '', look, font, upright, size }: {
    text: string; accent?: string; look: 'chrome' | 'classic' | 'plain'; font: string; upright: boolean; size: number
  } = $props()
</script>

<span
  class="heading"
  data-look={look}
  data-text={accent ? `${text} ${accent}` : text}
  style:font-family={font}
  style:font-size="{size}px"
  style:font-style={upright ? 'normal' : 'italic'}
><span class="f">{text}{#if accent}<span class="acc"> {accent}</span>{/if}</span></span>

<style>
  .heading { position: relative; display: inline-block; font-weight: 900; line-height: 1.08; letter-spacing: 0.02em; white-space: nowrap; padding: 0 0.06em; }
  .f { position: relative; z-index: 1; display: inline-block; }
  .heading::before { content: attr(data-text); position: absolute; left: 0.06em; top: 0; z-index: 0; white-space: nowrap; display: none; }

  [data-look='chrome']::before { display: block; -webkit-text-stroke: 0.14em #0a0f1c; color: #0a0f1c; text-shadow: 0 0.06em 0 #000; }
  [data-look='chrome'] .f {
    color: transparent; -webkit-text-fill-color: transparent;
    background: linear-gradient(180deg, #fff 0%, #f1f4f7 28%, #c3cad3 46%, #4f5a67 50%, #7f8a97 60%, #cdd4db 82%, #fff 100%);
    -webkit-background-clip: text; background-clip: text;
  }
  [data-look='chrome'] .acc { background: linear-gradient(160deg, #8be6ff, #2a7bff 35%, #6a3dff 60%, #e02fbf 80%, #ff5a2e); -webkit-background-clip: text; background-clip: text; }

  [data-look='classic']::before { display: block; -webkit-text-stroke: 0.14em #0b2a6f; color: #0b2a6f; text-shadow: 0 0.07em 0 #061a47, 0 0.1em 0.07em rgba(0, 0, 0, 0.4); }
  [data-look='classic'] .f { color: #fff; }
  [data-look='classic'] .acc { color: #ffd31a; }

  [data-look='plain'] .f { color: #fff; text-shadow: 0 0.04em 0.1em rgba(0, 0, 0, 0.4); }
  [data-look='plain'] .acc { color: #ffd31a; }
</style>

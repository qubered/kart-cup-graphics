<script lang="ts">
  import type { TitleView } from '../../../shared/types'

  let { title, style, font, size }: { title: TitleView; style: 'chrome' | 'classic'; font: string; size: number } = $props()
</script>

<div class="title-lockup" data-style={style} style:font-family={font} style:--s="{size}px">
  {#if title.preTitle}
    <div class="pre"><span>{title.preTitle}</span></div>
  {/if}
  <div class="line">
    <span class="t" data-text={title.title}><span class="f">{title.title}</span></span>
    {#if title.accent}
      <span class="a" data-text={title.accent}><span class="f">{title.accent}</span></span>
    {/if}
  </div>
</div>

<style>
  .title-lockup { display: inline-flex; flex-direction: column; align-items: center; font-size: var(--s); line-height: 1; }
  .pre {
    background: #ffd31a; color: #14213d; transform: skewX(-10deg);
    padding: 0.12em 0.55em 0.09em; margin-bottom: 0.28em;
    font-size: 0.2em; letter-spacing: 0.12em; font-weight: 400; white-space: nowrap;
    box-shadow: 0 0.12em 0 rgba(0, 0, 0, 0.3), 0 0 0 0.05em #fff;
  }
  .pre span { display: block; transform: skewX(10deg); }
  .line { display: flex; align-items: baseline; gap: 0.18em; white-space: nowrap; }
  .t, .a { position: relative; display: inline-block; padding: 0 0.04em; }
  .t::before, .a::before {
    content: attr(data-text); position: absolute; left: 0.04em; top: 0; white-space: nowrap; z-index: 0;
  }
  .f { position: relative; z-index: 1; display: inline-block; }
  .a { font-size: 1.12em; }

  /* S1 chrome */
  [data-style='chrome'] .t::before { -webkit-text-stroke: 0.17em #0a0f1c; color: #0a0f1c; text-shadow: 0 0.07em 0 #000, 0 0.1em 0.06em rgba(0, 0, 0, 0.5); }
  [data-style='chrome'] .a::before { -webkit-text-stroke: 0.17em #0a0f1c; color: #0a0f1c; text-shadow: 0 0.07em 0 #000, 0 0.1em 0.06em rgba(0, 0, 0, 0.5); }
  [data-style='chrome'] .t .f {
    color: transparent; -webkit-text-fill-color: transparent;
    background: linear-gradient(180deg, #fff 0%, #f1f4f7 28%, #c3cad3 46%, #4f5a67 50%, #7f8a97 60%, #cdd4db 82%, #fff 100%);
    -webkit-background-clip: text; background-clip: text;
  }
  [data-style='chrome'] .a .f {
    color: transparent; -webkit-text-fill-color: transparent;
    background: linear-gradient(160deg, #8be6ff 0%, #2a7bff 30%, #6a3dff 55%, #e02fbf 78%, #ff5a2e 100%);
    -webkit-background-clip: text; background-clip: text;
  }

  /* S3 classic */
  [data-style='classic'] .t::before, [data-style='classic'] .a::before {
    -webkit-text-stroke: 0.16em #0b2a6f; color: #0b2a6f; text-shadow: 0 0.08em 0 #061a47, 0 0.12em 0.08em rgba(0, 0, 0, 0.45);
  }
  [data-style='classic'] .t .f { color: #fff; }
  [data-style='classic'] .a .f { color: #ffd31a; }
</style>

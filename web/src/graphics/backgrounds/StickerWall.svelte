<script lang="ts">
  import type { TitleView } from '../../../../shared/types'
  import { fitText } from '../../lib/fit-text'
  import { BANDS, BAND_MAX, STICKERS, TILE_H, TILE_W, TONES } from './stickers'

  let { watermark, title, titleFont, labelFont, w, h, lowfx }: {
    watermark: string; title: TitleView; titleFont: string; labelFont: string; w: number; h: number; lowfx: boolean
  } = $props()

  const tiles = $derived(Array.from({ length: Math.ceil(w / TILE_W) + 2 }, (_, i) => i))
  const SLOT = 560
  const parade = ['kart', 'bike', 'kart', 'kart', 'bike', 'kart', 'bike']
  const plateMax = $derived(Math.round(w * 0.42))
  const roadY = $derived(h - 190)
</script>

<div class="sticker-wall" class:lowfx style:width="{w}px" style:height="{h}px">
  <div class="drift" style:left="{-TILE_W}px" style:width="{tiles.length * TILE_W}px" style:height="{TILE_H}px">
    {#each tiles as t (t)}
      <div class="tile" style:left="{t * TILE_W}px" style:width="{TILE_W}px" style:height="{TILE_H}px">
        {#each STICKERS as st, i (i)}
          {@const tone = TONES[st.tone]}
          <div class="sticker {st.shape}" style:left="{st.x}px" style:top="{st.y}px" style:width="{st.w}px" style:height="{st.h}px"
            style:background={tone[0]} style:color={tone[1]} style:transform="rotate({st.rot}deg)">
            <span data-sticker-text style:font-family={labelFont} style:font-size="{st.size}px"
              use:fitText={{ max: st.w - 56, text: st.text + st.size }}>{st.text}</span>
          </div>
        {/each}
        {#each BANDS as b (b.y)}
          <div class="band" style:top="{b.y}px" style:height="{b.h}px" style:left="{b.dx}px" style:width="{TILE_W}px">
            <span class="wm" data-sticker-text style:font-family={titleFont} style:font-size="{b.h * 0.82}px"
              use:fitText={{ max: BAND_MAX, text: watermark }}>{watermark}</span>
          </div>
        {/each}
      </div>
    {/each}
  </div>

  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs>
      <symbol id="sw-kart" viewBox="0 0 300 130">
        <path d="M20 84 L48 58 L120 52 L150 22 Q168 12 188 24 L196 52 L262 60 Q284 66 286 86 L286 98 L20 98 Z" />
        <rect x="6" y="40" width="26" height="14" rx="4" /><rect x="12" y="46" width="10" height="40" />
        <circle cx="76" cy="100" r="28" /><circle cx="232" cy="100" r="30" />
        <circle cx="168" cy="14" r="16" />
      </symbol>
      <symbol id="sw-bike" viewBox="0 0 300 130">
        <circle cx="60" cy="96" r="32" /><circle cx="244" cy="96" r="32" />
        <path d="M60 96 L120 62 L190 58 L244 96 L234 100 L186 72 L130 76 L70 100 Z" />
        <path d="M110 58 L150 24 Q164 12 180 22 L186 58 Z" /><circle cx="168" cy="8" r="16" />
        <path d="M196 56 L236 40 L242 50 L206 70 Z" />
      </symbol>
    </defs>
  </svg>

  <div class="road" style:top="{roadY}px"></div>
  <div class="parade" style:top="{roadY - 118}px" style:width="{parade.length * SLOT * 2}px" style:--shift="{-parade.length * SLOT}px">
    {#each [0, 1] as copy (copy)}
      {#each parade as kind, i (i)}
        <svg class="kart" viewBox="0 0 300 130" style:left="{(copy * parade.length + i) * SLOT + 60}px" width="270" height="117"><use href={kind === 'kart' ? '#sw-kart' : '#sw-bike'} /></svg>
      {/each}
    {/each}
  </div>

  <div class="plate-wrap" style:top="{h * 0.2}px" style:height="{h * 0.42}px">
    <div class="plate">
      {#if title.preTitle}
        <div class="pre" style:font-family={labelFont}><span>{title.preTitle}</span></div>
      {/if}
      <div class="ptitle" style:font-family={titleFont}>
        <span class="pt" use:fitText={{ max: plateMax, text: title.title + title.accent }}>{title.title}{#if title.accent}<span class="acc"> {title.accent}</span>{/if}</span>
      </div>
    </div>
  </div>
</div>

<style>
  .sticker-wall { position: relative; overflow: hidden; background: #f3f3f3; }
  .drift { position: absolute; top: 0; animation: drift 80s linear infinite; }
  @keyframes drift { from { transform: translateX(0); } to { transform: translateX(-1280px); } }
  .tile { position: absolute; top: 0; }
  .sticker {
    position: absolute; display: flex; align-items: center; justify-content: center; box-sizing: border-box;
    box-shadow: inset 0 0 0 6px rgba(255, 255, 255, 0.7), 0 4px 0 rgba(0, 0, 0, 0.06);
  }
  .sticker.round { border-radius: 40px; }
  .sticker.ellipse { border-radius: 50%; }
  .sticker.tag { border-radius: 14px 70px 14px 70px; }
  .sticker.stripe {
    border-radius: 24px;
    background-image: repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.38) 0 22px, transparent 22px 44px);
  }
  .sticker span, .band span { white-space: nowrap; font-weight: 900; font-style: italic; letter-spacing: 0.02em; line-height: 1.1; }
  .band { position: absolute; display: flex; align-items: center; justify-content: flex-start; padding-left: 150px; box-sizing: border-box; background: transparent; }
  .band::before { content: ''; position: absolute; left: -1280px; right: -1280px; top: 0; bottom: 0; background: #e9e9e9; z-index: 0; }
  .wm { position: relative; color: #cbcbcb; font-style: normal !important; font-weight: 400 !important; letter-spacing: 0.04em !important; }

  .road { position: absolute; left: 0; right: 0; height: 10px; background: #151515; }
  .parade { position: absolute; left: 0; height: 120px; animation: march 55s linear infinite; }
  @keyframes march { from { transform: translateX(0); } to { transform: translateX(var(--shift)); } }
  .kart { position: absolute; top: 0; fill: #111; }

  .plate-wrap { position: absolute; left: 0; right: 0; display: flex; align-items: center; justify-content: center; }
  .plate {
    display: flex; flex-direction: column; align-items: center; padding: 38px 64px 44px; background: #fff;
    border: 12px solid #111; border-radius: 36px; transform: rotate(-2.5deg); box-shadow: 14px 16px 0 rgba(0, 0, 0, 0.85);
  }
  .pre { background: #e60012; color: #fff; transform: skewX(-10deg); padding: 6px 28px; font-weight: 800; font-size: 34px; letter-spacing: 0.12em; margin-bottom: 20px; white-space: nowrap; }
  .pre span { display: block; transform: skewX(10deg); }
  .ptitle { font-size: 150px; line-height: 1.1; color: #111; white-space: nowrap; }
  .pt { display: inline-block; white-space: nowrap; }
  .acc { color: #e60012; }
</style>

<script lang="ts">
  import { onMount } from 'svelte'
  import { send } from '../store'
  import { fontStack } from '../../../../shared/fonts'
  import type { NoticeDoc } from '../../../../shared/types'
  import { htmlToDoc, loadDoc } from '../../lib/notice-html'

  let { doc, fonts }: { doc: NoticeDoc; fonts: string[] } = $props()

  const SIZES = [32, 40, 48, 64, 80, 96, 128, 160, 200]
  const SWATCHES = ['#ffffff', '#ffd21f', '#e60012', '#1e6cff', '#22b14c', '#ff5fa2', '#ff8a00', '#14213d']
  let surface: HTMLDivElement
  let lastSent = ''
  let timer: ReturnType<typeof setTimeout> | undefined

  // Take state changes from elsewhere (another operator, a preset recall) unless this editor is mid-edit.
  $effect(() => {
    const json = JSON.stringify(doc)
    if (!surface || json === lastSent || document.activeElement === surface) return
    loadDoc(surface, doc)
    lastSent = json
  })
  onMount(() => { loadDoc(surface, doc); lastSent = JSON.stringify(doc) })

  function emit() {
    clearTimeout(timer)
    timer = setTimeout(() => {
      const next = htmlToDoc(surface, fonts)
      const json = JSON.stringify(next)
      if (json === lastSent) return
      lastSent = json
      send({ type: 'setNotice', doc: next })
    }, 150)
  }
  function cmd(name: string, value?: string) {
    surface.focus()
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(name, false, value)
    emit()
  }
  function setSize(px: number) {
    surface.focus()
    document.execCommand('styleWithCSS', false, 'false')
    document.execCommand('fontSize', false, '7')
    for (const f of Array.from(surface.querySelectorAll('font[size="7"]'))) {
      const s = document.createElement('span')
      s.style.fontSize = `${px}px`
      while (f.firstChild) s.appendChild(f.firstChild)
      f.replaceWith(s)
    }
    emit()
  }
  const keep = (e: MouseEvent) => e.preventDefault() // buttons must not steal the text selection
</script>

<div class="toolbar" role="toolbar" aria-label="Notice formatting">
  <select name="noticeFont" aria-label="Font" onmousedown={(e) => e.stopPropagation()}
    onchange={(e) => { cmd('fontName', e.currentTarget.value); e.currentTarget.selectedIndex = 0 }}>
    <option value="" selected disabled>Font</option>
    {#each fonts as f (f)}<option value={fontStack(f)} style="font-family:{fontStack(f)}">{f}</option>{/each}
  </select>
  <select name="noticeSize" aria-label="Size" onchange={(e) => { setSize(+e.currentTarget.value); e.currentTarget.selectedIndex = 0 }}>
    <option value="" selected disabled>Size</option>
    {#each SIZES as s (s)}<option value={s}>{s}</option>{/each}
  </select>
  <div class="seg">
    <button type="button" title="Bold" aria-label="Bold" onmousedown={keep} onclick={() => cmd('bold')}><b>B</b></button>
    <button type="button" title="Italic" aria-label="Italic" onmousedown={keep} onclick={() => cmd('italic')}><i>I</i></button>
    <button type="button" title="Underline" aria-label="Underline" onmousedown={keep} onclick={() => cmd('underline')}><u>U</u></button>
  </div>
  <div class="seg">
    <button type="button" aria-label="Align left" onmousedown={keep} onclick={() => cmd('justifyLeft')}>Left</button>
    <button type="button" aria-label="Align centre" onmousedown={keep} onclick={() => cmd('justifyCenter')}>Centre</button>
    <button type="button" aria-label="Align right" onmousedown={keep} onclick={() => cmd('justifyRight')}>Right</button>
  </div>
  <div class="sw">
    {#each SWATCHES as c (c)}
      <button type="button" class="chip" style="background:{c}" aria-label="Colour {c}" onmousedown={keep} onclick={() => cmd('foreColor', c)}></button>
    {/each}
    <input type="color" name="noticeColour" aria-label="Custom colour" value="#ffffff" onchange={(e) => cmd('foreColor', e.currentTarget.value)} />
  </div>
  <button type="button" onmousedown={keep} onclick={() => cmd('removeFormat')}>Clear formatting</button>
</div>
<div class="frame">
  <div class="surface" bind:this={surface} contenteditable="true" role="textbox" aria-multiline="true" aria-label="Notice board text"
    spellcheck="false" tabindex="0" oninput={emit} onblur={emit}></div>
</div>

<style>
  .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; }
  .sw { display: flex; gap: 4px; align-items: center; }
  .chip { width: 22px; height: 22px; padding: 0; border-radius: 50%; border: 2px solid #475569; }
  input[type='color'] { width: 28px; height: 24px; padding: 0; border: 0; background: none; }
  /* Preview at 40% of the 1080p design size, on the board's own colours. */
  .frame { background: #14213d; border: 3px solid #fff; border-radius: 14px; padding: 8px; }
  .surface {
    zoom: .4; min-height: 700px; color: #fff; font-family: Rubik, sans-serif; font-size: 48px; line-height: 1.2;
    outline: none; white-space: pre-wrap; overflow-wrap: anywhere;
  }
  .surface:focus { box-shadow: 0 0 0 2px #38bdf8; }
</style>

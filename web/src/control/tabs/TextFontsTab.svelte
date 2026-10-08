<script lang="ts">
  import { control, send } from '../store'
  import { sync } from '../sync'
  import { BUNDLED_FONTS, fontStack } from '../../../../shared/fonts'
  import type { EventText } from '../../../../shared/types'
  import NoticeEditor from '../notice/NoticeEditor.svelte'

  const st = $derived($control.payload?.state)
  const ev = $derived(st?.draft.event)
  const ty = $derived(st?.draft.typography)
  const fonts = $derived([...BUNDLED_FONTS, ...(st?.uploadedFonts ?? []).map((f) => f.family)])

  const TEXT: { name: keyof EventText; label: string }[] = [
    { name: 'preTitle', label: 'Pre-title' },
    { name: 'title', label: 'Title' },
    { name: 'titleAccent', label: 'Title accent' },
    { name: 'watermark', label: 'Watermark' },
    { name: 'holdMessage', label: 'Hold message' },
  ]
  type Role = 'eventTitle' | 'headings' | 'names' | 'labels'
  const ROLES: { id: Role; label: string }[] = [
    { id: 'eventTitle', label: 'Event title' },
    { id: 'headings', label: 'Headings' },
    { id: 'names', label: 'Names & numbers' },
    { id: 'labels', label: 'Labels' },
  ]

  let upMsg = $state<{ ok: boolean; text: string } | null>(null)
  let busy = $state(false)

  async function upload(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    busy = true
    upMsg = null
    try {
      if (!/^[A-Za-z0-9 _.-]+\.(ttf|otf|woff2?)$/i.test(file.name) || file.name.includes('..')) {
        throw new Error('Use a .ttf, .otf, .woff or .woff2 file with a simple name (letters, digits, space, _ . -).')
      }
      if (file.size > 10 * 1024 * 1024) throw new Error('File is larger than 10 MB.')
      const res = await fetch(`/api/fonts/${encodeURIComponent(file.name)}`, { method: 'PUT', body: file })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? body.message ?? `Upload failed (${res.status})`)
      upMsg = { ok: true, text: `Uploaded "${body.family}". Pick it from any font list.` }
    } catch (err) {
      upMsg = { ok: false, text: err instanceof Error ? err.message : String(err) }
    } finally {
      busy = false
      input.value = ''
    }
  }
</script>

{#if st && ev && ty}
  <div class="card">
    <h2>Event text</h2>
    {#each TEXT as f (f.name)}
      <div class="field">
        <label for="ev-{f.name}">{f.label}</label>
        <input id="ev-{f.name}" type="text" name={f.name} use:sync={ev[f.name]}
          oninput={(e) => send({ type: 'setEventText', patch: { [f.name]: e.currentTarget.value } })} />
      </div>
    {/each}
    <div class="field">
      <span class="dim" style="font-size:12px">Event title style</span>
      <div class="seg">
        {#each [['chrome', 'Chrome'], ['classic', 'Classic']] as [v, l] (v)}
          <button class:draft={ty.eventTitle.style === v}
            onclick={() => send({ type: 'setTypography', role: 'eventTitle', patch: { style: v as 'chrome' | 'classic' } })}>{l}</button>
        {/each}
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Notice board</h2>
    <NoticeEditor doc={st.draft.notice} {fonts} />
    <div class="dim" style="margin-top:8px; font-size:12px">Shown by the Notice scene. Sizes are px on a 1080p canvas.</div>
  </div>

  <div class="card">
    <h2>Fonts</h2>
    {#each ROLES as r (r.id)}
      <div class="field" data-role={r.id}>
        <label for="font-{r.id}">{r.label}</label>
        <div class="row" style="flex-wrap:nowrap">
          <select id="font-{r.id}" name="font" value={ty[r.id].font} style="flex:1; font-family:{fontStack(ty[r.id].font)}"
            onchange={(e) => send({ type: 'setTypography', role: r.id, patch: { font: e.currentTarget.value } })}>
            {#each fonts as f (f)}
              <option value={f} style="font-family:{fontStack(f)}">{f}</option>
            {/each}
          </select>
          {#if r.id === 'headings'}
            <div class="seg">
              {#each [['chrome', 'Chrome'], ['classic', 'Classic'], ['plain', 'Plain']] as [v, l] (v)}
                <button class:draft={ty.headings.look === v}
                  onclick={() => send({ type: 'setTypography', role: 'headings', patch: { look: v as 'chrome' | 'classic' | 'plain' } })}>{l}</button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <div class="card">
    <h2>Custom fonts</h2>
    <div class="row">
      <input type="file" name="fontFile" accept=".ttf,.otf,.woff,.woff2" disabled={busy} onchange={upload} />
    </div>
    {#if upMsg}<div class="msg" class:ok={upMsg.ok} class:err={!upMsg.ok} role="status">{upMsg.text}</div>{/if}
    <div class="dim" style="margin-top:10px; font-size:12px">
      {#if st.uploadedFonts.length}
        Uploaded: {#each st.uploadedFonts as f, i (f.file)}<span style="font-family:{fontStack(f.family)}">{f.family}</span>{i < st.uploadedFonts.length - 1 ? ', ' : ''}{/each}
      {:else}No uploaded fonts yet.{/if}
    </div>
  </div>
{/if}

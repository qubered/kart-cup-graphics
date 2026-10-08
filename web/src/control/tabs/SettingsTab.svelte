<script lang="ts">
  import { control, send } from '../store'

  const cat = $derived($control.catalog)
  let urls = $state<string[]>([])
  $effect(() => {
    fetch('/api/info')
      .then((r) => r.json())
      .then((j: { lanUrls?: string[] }) => (urls = j.lanUrls ?? []))
      .catch(() => {})
  })

  let msg = $state<{ ok: boolean; text: string } | null>(null)

  const LOGO_PX = 512
  let logoMsg = $state<{ ok: boolean; text: string } | null>(null)
  const logoUrl = $derived($control.payload?.state.settings?.logo)

  /** Fit the image inside a transparent LOGO_PX square (aspect kept, centred) and return it as a PNG. */
  async function normaliseLogo(file: File): Promise<Blob> {
    const src = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = src
      await img.decode()
      const w = img.naturalWidth || LOGO_PX, h = img.naturalHeight || LOGO_PX
      const k = Math.min(LOGO_PX / w, LOGO_PX / h)
      const c = document.createElement('canvas')
      c.width = c.height = LOGO_PX
      const g = c.getContext('2d')!
      g.imageSmoothingQuality = 'high'
      g.drawImage(img, (LOGO_PX - w * k) / 2, (LOGO_PX - h * k) / 2, w * k, h * k)
      return await new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error('Could not convert image'))), 'image/png'))
    } finally {
      URL.revokeObjectURL(src)
    }
  }
  async function uploadLogo(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    logoMsg = null
    try {
      const res = await fetch('/api/logo', { method: 'PUT', headers: { 'content-type': 'image/png' }, body: await normaliseLogo(file) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? `Upload failed (${res.status})`)
      logoMsg = { ok: true, text: 'Logo updated.' }
    } catch (err) {
      logoMsg = { ok: false, text: err instanceof Error ? err.message : 'Not a readable image' }
    } finally {
      input.value = ''
    }
  }
  async function removeLogo() {
    logoMsg = null
    await fetch('/api/logo', { method: 'DELETE' }).catch(() => {})
  }

  function resetScores() {
    if (confirm('Reset all scores and saved races?')) send({ type: 'resetScores' })
  }
  function resetShow() {
    if (confirm('Reset the whole show to defaults? This clears players, scores, layers and outputs.')) send({ type: 'resetShow' })
  }
  async function importShow(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    msg = null
    try {
      if (!confirm('Import this show file? It replaces the current draft, outputs and layers.')) return
      const res = await fetch('/api/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: await file.text() })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? body.message ?? `Import failed (${res.status})`)
      msg = { ok: true, text: 'Show imported.' }
    } catch (err) {
      msg = { ok: false, text: err instanceof Error ? err.message : String(err) }
    } finally {
      input.value = ''
    }
  }
</script>

<div class="card">
  <h2>Show file</h2>
  <div class="row">
    <a href="/api/export" download="kart-show.json"><button type="button">Export show</button></a>
    <label class="row" style="gap:6px"><span class="dim">Import show</span>
      <input type="file" name="importFile" accept="application/json,.json" onchange={importShow} />
    </label>
  </div>
  {#if msg}<div class="msg" class:ok={msg.ok} class:err={!msg.ok} role="status">{msg.text}</div>{/if}
</div>

<div class="card">
  <h2>Logo</h2>
  <div class="row" style="gap:12px">
    <div style="width:64px; height:64px; background:#0b2a5b; border-radius:6px; display:grid; place-items:center">
      {#if logoUrl}<img src={logoUrl} alt="Current logo" width="56" height="56" />{:else}<span class="dim" style="font-size:11px">Default</span>{/if}
    </div>
    <input type="file" name="logoFile" accept="image/*" onchange={uploadLogo} />
    {#if logoUrl}<button type="button" onclick={removeLogo}>Use default</button>{/if}
  </div>
  {#if logoMsg}<div class="msg" class:ok={logoMsg.ok} class:err={!logoMsg.ok} role="status">{logoMsg.text}</div>{/if}
  <div class="dim" style="margin-top:6px">Scaled to fit a square and shown on the title scene and HOLD. Turn it on or off per output with the Logo switch in the layer controls (Title scene).</div>
</div>

<div class="card">
  <h2>Mattify</h2>
  <label class="row" style="gap:8px">
    <input type="checkbox" name="mattify" role="switch" checked={$control.payload?.state.settings?.mattify ?? false}
      onchange={(e) => send({ type: 'setMattify', on: e.currentTarget.checked })} />
    <span>Replace the mushroom in the icon background (B) with the custom image</span>
  </label>
  <div class="dim" style="margin-top:6px">Applies instantly on every output, no Take needed. Off shows the normal mushroom.</div>
</div>

<div class="card">
  <h2>Reset</h2>
  <div class="row">
    <button type="button" class="danger" onclick={resetScores}>Reset scores</button>
    <button type="button" class="danger" onclick={resetShow}>Reset show</button>
    <button type="button" onclick={() => send({ type: 'resetOnAirClock' })}>Reset on-air timer</button>
  </div>
</div>

<div class="card">
  <h2>Server</h2>
  {#if urls.length}
    <ul style="margin:0; padding-left:18px">
      {#each urls as u (u)}<li><code>{u}/control</code></li>{/each}
    </ul>
  {:else}<span class="dim">No LAN addresses reported.</span>{/if}
</div>

<div class="card">
  <h2>Asset catalog</h2>
  {#if cat}
    <div data-catalog>{cat.cups.length} cups · {cat.tracks.length} tracks · {cat.characters.length} characters</div>
  {:else}<span class="dim">Catalog not loaded.</span>{/if}
</div>

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

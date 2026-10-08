<script lang="ts">
  import { control, send } from '../store'
  import { sync } from '../sync'
  import type { OutputFormat, SafeArea } from '../../../../shared/types'

  const st = $derived($control.payload?.state)
  const presence = $derived($control.payload?.presence ?? {})

  let base = $state(location.origin)
  $effect(() => {
    fetch('/api/info')
      .then((r) => r.json())
      .then((j: { lanUrls?: string[] }) => { if (j.lanUrls?.[0]) base = j.lanUrls[0] })
      .catch(() => {})
  })

  let copied = $state('')
  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    copied = id
    setTimeout(() => { if (copied === id) copied = '' }, 1500)
  }

  const SIDES: (keyof SafeArea)[] = ['top', 'right', 'bottom', 'left']
  const num = (v: string, fallback: number) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : fallback)

  let newId = $state('')
  let newName = $state('')
  let newFormat = $state<OutputFormat>('hd')
  const slugOk = $derived(/^[a-z0-9-]+$/.test(newId) && !st?.outputs.some((o) => o.id === newId))

  function add(e: SubmitEvent) {
    e.preventDefault()
    if (!slugOk) return
    send({ type: 'addOutput', output: { id: newId, name: newName.trim() || newId, format: newFormat, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, graphicsScale: 1 } })
    newId = ''
    newName = ''
  }
  function remove(id: string, name: string) {
    if (confirm(`Remove output "${name}"?`)) send({ type: 'removeOutput', id })
  }
</script>

{#if st}
  <div class="card">
    <h2>Outputs</h2>
    <table class="tbl">
      <thead><tr><th>Name</th><th>Format</th><th>URL</th><th>Clients</th><th>Safe area T R B L</th><th>Scale</th><th></th></tr></thead>
      <tbody>
        {#each st.outputs as o (o.id)}
          {@const url = `${base}/out/${o.id}`}
          <tr data-output-row={o.id}>
            <td><input type="text" name="rowName" style="width:110px" use:sync={o.name}
              oninput={(e) => send({ type: 'updateOutput', id: o.id, patch: { name: e.currentTarget.value } })} /></td>
            <td>
              <select name="rowFormat" value={o.format}
                onchange={(e) => send({ type: 'updateOutput', id: o.id, patch: { format: e.currentTarget.value as OutputFormat } })}>
                <option value="wide">Wide 3840×1152</option>
                <option value="twin">Twin 1920×1152</option>
                <option value="hd">HD 1920×1080</option>
              </select>
            </td>
            <td>
              <div class="urlrow"><code>{url}</code> <button type="button" onclick={() => copy(url, o.id)}>{copied === o.id ? 'Copied' : 'Copy'}</button></div>
              {#if o.format === 'twin'}
                {#each ['left', 'right'] as half (half)}
                  <div class="urlrow" data-half-url={half}><code>{url}/{half}</code> <span class="dim">960×1152</span>
                    <button type="button" onclick={() => copy(`${url}/${half}`, `${o.id}/${half}`)}>{copied === `${o.id}/${half}` ? 'Copied' : 'Copy'}</button></div>
                {/each}
              {/if}
            </td>
            <td data-clients>{presence[o.id]?.program ?? 0}{#if o.format === 'twin'}<div class="dim">L {presence[o.id]?.left ?? 0} · R {presence[o.id]?.right ?? 0}</div>{/if}</td>
            <td>
              <div class="row" style="gap:4px; flex-wrap:nowrap">
                {#each SIDES as side (side)}
                  <input type="number" name="safe-{side}" min="0" aria-label="Safe area {side}" use:sync={o.safeArea[side]}
                    onchange={(e) => send({ type: 'updateOutput', id: o.id, patch: { safeArea: { ...o.safeArea, [side]: Math.max(0, num(e.currentTarget.value, 0)) } } })} />
                {/each}
              </div>
            </td>
            <td><input type="number" name="scale" step="0.05" min="0.25" max="3" aria-label="Graphics scale" use:sync={o.graphicsScale}
              onchange={(e) => send({ type: 'updateOutput', id: o.id, patch: { graphicsScale: Math.min(3, Math.max(0.25, num(e.currentTarget.value, 1))) } })} /></td>
            <td><button type="button" class="danger" onclick={() => remove(o.id, o.name)}>Remove</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="card" data-superwide>
    <h2>Superwide 5760×1152</h2>
    <p class="dim">One URL for the whole stage: left twin half (960) · wide (3840) · right twin half (960). It shows the Program of the
      <code>wide</code> and <code>twins</code> outputs, so arm and take those as usual. Use <code>?wide=&lt;id&gt;&amp;twins=&lt;id&gt;</code> for other output ids.</p>
    <div class="urlrow"><code>{base}/out/superwide</code>
      <button type="button" onclick={() => copy(`${base}/out/superwide`, 'superwide')}>{copied === 'superwide' ? 'Copied' : 'Copy'}</button></div>
  </div>

  <form class="card" onsubmit={add}>
    <h2>Add output</h2>
    <div class="row">
      <input type="text" name="id" placeholder="id (a-z, 0-9, -)" bind:value={newId} autocomplete="off" />
      <input type="text" name="name" placeholder="Name" bind:value={newName} autocomplete="off" />
      <select name="format" bind:value={newFormat}>
        <option value="wide">Wide 3840×1152</option>
        <option value="twin">Twin 1920×1152</option>
        <option value="hd">HD 1920×1080</option>
      </select>
      <button type="submit" class="primary" disabled={!slugOk}>Add output</button>
    </div>
    {#if newId && !slugOk}<div class="msg err">Id must be unique and use only a-z, 0-9 and -.</div>{/if}
  </form>
{/if}

<style>
  .urlrow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 2px 0; }
</style>

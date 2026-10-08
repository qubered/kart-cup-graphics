<script lang="ts">
  import { light } from './presence'
  import { control, send, selectOutput } from './store'
  import { shortcutCommand } from './shortcuts'
  import TopBar from './TopBar.svelte'
  import Monitors from './Monitors.svelte'
  import LayerControls from './LayerControls.svelte'
  import MasterBar from './MasterBar.svelte'
  import ShowTab from './tabs/ShowTab.svelte'
  import TextFontsTab from './tabs/TextFontsTab.svelte'
  import OutputsTab from './tabs/OutputsTab.svelte'
  import PresetsTab from './tabs/PresetsTab.svelte'
  import CuesTab from './tabs/CuesTab.svelte'
  import TournamentTab from './tabs/TournamentTab.svelte'
  import SettingsTab from './tabs/SettingsTab.svelte'

  const TABS = ['Show', 'Tournament', 'Presets', 'Cues', 'Text & Fonts', 'Outputs', 'Settings'] as const
  let tab = $state<(typeof TABS)[number]>('Show')

  const st = $derived($control.payload?.state)
  const pending = $derived($control.payload?.pending ?? {})
  const presence = $derived($control.payload?.presence ?? {})

  function onKeydown(e: KeyboardEvent) {
    if (!st || !$control.connected || e.ctrlKey || e.metaKey || e.altKey) return
    // The notice editor is a rich-text field: typing there (space, Enter, capital B...) must never fire the show shortcuts.
    if ((e.target as HTMLElement | null)?.isContentEditable && e.key !== 'Escape') return
    const cmd = shortcutCommand(
      { key: e.key, shiftKey: e.shiftKey, targetTag: (e.target as HTMLElement | null)?.tagName ?? 'BODY' },
      { outputs: st.outputs.map((o) => o.id), armed: st.armed, hold: st.overlay.hold.on, ftb: st.overlay.ftb },
    )
    if (cmd) {
      e.preventDefault()
      send(cmd)
    }
  }
  function onKeyup(e: KeyboardEvent) {
    // Stop a focused button from also "clicking" on Space.
    if (e.key === ' ' && (e.target as HTMLElement | null)?.tagName === 'BUTTON') e.preventDefault()
  }
</script>

<svelte:window onkeydown={onKeydown} onkeyup={onKeyup} />

{#if !$control.connected}
  <div class="banner" role="alert">Disconnected — reconnecting…</div>
{/if}
{#if $control.error}
  <div class="toast" role="status">{$control.error}</div>
{/if}

<fieldset class="bare shell" disabled={!$control.connected}>
  <TopBar />
  <div class="main">
    <section class="left">
      <div class="tabs" role="tablist">
        {#each TABS as t (t)}
          <button class="tab" role="tab" aria-selected={tab === t} onclick={() => (tab = t)}>{t}</button>
        {/each}
      </div>
      <div class="body">
        {#if tab === 'Show'}
          <ShowTab />
        {:else if tab === 'Tournament'}
          <TournamentTab />
        {:else if tab === 'Presets'}
          <PresetsTab />
        {:else if tab === 'Cues'}
          <CuesTab />
        {:else if tab === 'Text & Fonts'}
          <TextFontsTab />
        {:else if tab === 'Outputs'}
          <OutputsTab />
        {:else}
          <SettingsTab />
        {/if}
      </div>
    </section>
    <section class="right">
      <div class="otabs" role="tablist" aria-label="Outputs">
        {#each st?.outputs ?? [] as o (o.id)}
          {@const lt = light(presence[o.id], o.format)}
          <button class="otab" role="tab" data-output-tab={o.id} aria-selected={$control.selectedOutput === o.id}
            onclick={() => selectOutput(o.id)}>
            <span class="led" class:on={lt === 'on'} class:partial={lt === 'partial'}></span>{o.name}
            {#if (pending[o.id] ?? 0) > 0}<span class="badge" data-pending>{pending[o.id]}</span>{/if}
          </button>
        {/each}
        <a class="otab" href="/multiview" target="_blank" rel="noopener">Open Multiview ↗</a>
      </div>
      <Monitors />
      <LayerControls />
    </section>
  </div>
  <MasterBar />
</fieldset>

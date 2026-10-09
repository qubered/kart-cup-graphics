<script lang="ts">
  // Setup: the rarely-touched configuration, one section at a time (replaces the old Text & Fonts / Outputs / Settings tabs).
  import TextFontsTab from '../tabs/TextFontsTab.svelte'
  import OutputsTab from '../tabs/OutputsTab.svelte'
  import SettingsTab from '../tabs/SettingsTab.svelte'

  const TABS = [
    { id: 'Text & Fonts', hint: 'Event title, fonts, notice board, QR codes' },
    { id: 'Outputs', hint: 'Screens, safe areas, graphics scale' },
    { id: 'Settings', hint: 'Show file, Mattify, logo, resets' },
  ] as const
  let tab = $state<(typeof TABS)[number]['id']>('Text & Fonts')
</script>

<div class="setup">
  <nav class="snav u-panel" role="tablist" aria-label="Setup" aria-orientation="vertical">
    {#each TABS as t (t.id)}
      <button type="button" class="si" role="tab" aria-selected={tab === t.id} onclick={() => (tab = t.id)}>
        <b>{t.id}</b><small>{t.hint}</small>
      </button>
    {/each}
  </nav>
  <section class="sbody u-panel">
    <div class="inner">
      {#if tab === 'Text & Fonts'}<TextFontsTab />
      {:else if tab === 'Outputs'}<OutputsTab />
      {:else}<SettingsTab />{/if}
    </div>
  </section>
</div>

<style>
  .setup { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 14px; padding: 12px 14px; height: 100%; min-height: 0; }
  .snav { padding: 8px; gap: 4px; align-content: start; overflow: auto; display: grid; }
  .si { display: grid; gap: 2px; text-align: left; min-height: 64px; padding: 8px 12px; border-radius: 10px; border: 1px solid transparent; background: transparent; align-content: center; }
  .si:hover:not(:disabled) { background: #181c24; border-color: transparent; }
  .si[aria-selected='true'] { background: #1d2430; border-color: #3a4455; }
  .si b { color: #fff; font-size: 14px; }
  .si small { color: var(--ui-muted); font-size: 11.5px; white-space: normal; }
  .sbody { min-width: 0; }
  .inner { padding: 14px; overflow: auto; min-height: 0; flex: 1; max-width: 980px; }
</style>

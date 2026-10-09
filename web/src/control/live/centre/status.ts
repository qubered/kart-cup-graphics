// What the Live page knows about "the look in Preview", shared by the monitors, the library header and the scene editor.
import { derived } from 'svelte/store'
import { control } from '../../store'
import type { Preset } from '../../../../../shared/types'
import { isModified, onAirLook } from './looks'

export interface PreviewLook {
  /** The loaded look (`lastPreset`), or null when Preview was not loaded from one (or it has been deleted). */
  preset: Preset | null
  /** Preview differs from the loaded look in a part the look restores. False when there is no loaded look. */
  modified: boolean
}

export const previewLook = derived(control, ($c): PreviewLook => {
  const st = $c.payload?.state
  const preset = st?.lastPreset ? (st.presets.find((p) => p.id === st.lastPreset) ?? null) : null
  return { preset, modified: !!st && !!preset && isModified(preset, st) }
})

/** The look that is on air (see onAirLook for the rule), or null. */
export const onAirLookId = derived(control, ($c): string | null => {
  const st = $c.payload?.state
  return st ? onAirLook(st.presets, st.outputs, st.program, st.lastPreset) : null
})

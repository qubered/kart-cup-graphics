import streamDeck, { SingletonAction, type DidReceiveSettingsEvent, type KeyAction, type KeyDownEvent, type SendToPluginEvent, type WillAppearEvent } from '@elgato/streamdeck'
import type { JsonObject, JsonValue } from '@elgato/utils'
import { KartCupClient, normaliseBase, recallCommand, stepCommand, takeCommand, type PresetList } from './client'

interface Global extends JsonObject { serverUrl?: string }
interface RecallSettings extends JsonObject { presetId?: string; take?: string }
interface StepSettings extends JsonObject { direction?: string; take?: string }
interface TakeSettings extends JsonObject { mode?: string }

let serverUrl = normaliseBase(undefined)
const client = new KartCupClient(() => serverUrl)
let latest: PresetList | null = null

async function refresh(): Promise<void> {
  try { latest = await client.presets() } catch { latest = null }
  await recallAction.render()
}

async function run(ev: KeyDownEvent<JsonObject>, cmd: Record<string, unknown> | null): Promise<void> {
  if (!cmd) { await ev.action.showAlert(); return }
  try {
    await client.command(cmd)
    await ev.action.showOk()
    void refresh()
  } catch (e) {
    streamDeck.logger.warn(`command failed: ${(e as Error).message}`)
    await ev.action.showAlert()
  }
}

class RecallPreset extends SingletonAction<RecallSettings> {
  override readonly manifestId = 'com.qubered.kartcup.recall'

  override async onWillAppear(ev: WillAppearEvent<RecallSettings>): Promise<void> {
    await this.paint(ev.action as KeyAction<RecallSettings>, ev.payload.settings)
  }
  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<RecallSettings>): Promise<void> {
    if (ev.action.isKey()) await this.paint(ev.action, ev.payload.settings)
  }
  override async onKeyDown(ev: KeyDownEvent<RecallSettings>): Promise<void> {
    const id = ev.payload.settings.presetId
    await run(ev, id ? recallCommand(id, ev.payload.settings.take) : null)
  }
  // The property inspector's preset dropdown asks for the live list.
  override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, RecallSettings>): Promise<void> {
    if ((ev.payload as { event?: string } | null)?.event !== 'presets') return
    let items: { label: string; value: string }[] = []
    try { items = (await client.presets()).presets.map((p) => ({ label: p.name, value: p.id })) } catch { /* server offline: empty list */ }
    await streamDeck.ui.sendToPropertyInspector({ event: 'presets', items })
  }

  async render(): Promise<void> {
    for (const a of this.actions) if (a.isKey()) await this.paint(a, await a.getSettings())
  }
  private async paint(action: KeyAction<RecallSettings>, s: RecallSettings): Promise<void> {
    const preset = latest?.presets.find((p) => p.id === s.presetId)
    await action.setTitle(preset ? preset.name.replace(/ /g, '\n') : s.presetId ? '?' : '')
    await action.setState(latest && latest.cue === s.presetId ? 1 : 0)
  }
}

class StepCue extends SingletonAction<StepSettings> {
  override readonly manifestId = 'com.qubered.kartcup.step'
  override async onKeyDown(ev: KeyDownEvent<StepSettings>): Promise<void> {
    await run(ev, stepCommand(ev.payload.settings.direction, ev.payload.settings.take))
  }
}

class Take extends SingletonAction<TakeSettings> {
  override readonly manifestId = 'com.qubered.kartcup.take'
  override async onKeyDown(ev: KeyDownEvent<TakeSettings>): Promise<void> {
    await run(ev, takeCommand(ev.payload.settings.mode))
  }
}

const recallAction = new RecallPreset()
// Settings types are per-action; the registry only needs the base shape.
streamDeck.actions.registerAction(recallAction as unknown as SingletonAction)
streamDeck.actions.registerAction(new StepCue() as unknown as SingletonAction)
streamDeck.actions.registerAction(new Take() as unknown as SingletonAction)

streamDeck.settings.onDidReceiveGlobalSettings<Global>((ev) => {
  serverUrl = normaliseBase(ev.settings.serverUrl)
  void refresh()
})

await streamDeck.connect()
serverUrl = normaliseBase((await streamDeck.settings.getGlobalSettings<Global>()).serverUrl)
setInterval(() => { void refresh() }, 1500)
void refresh()

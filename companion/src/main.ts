import {
  combineRgb, InstanceBase, InstanceStatus, runEntrypoint,
  type CompanionActionDefinitions, type CompanionFeedbackDefinitions, type CompanionPresetDefinitions,
  type DropdownChoice, type SomeCompanionConfigField,
} from '@companion-module/base'
import { armCommand, overwritePresetCommand, savePresetCommand, baseUrl, cueActionCommand, cueKey, cueState, KartCupApi, recallCommand, resolveOnOff, stepSelectionCommand, takeCommand, type ServerState } from './api.js'

interface Config { host: string; port: number }

const TAKE_CHOICES: DropdownChoice[] = [
  { id: 'none', label: 'Recall only (don\'t take)' }, { id: 'cut', label: 'Cut' }, { id: 'auto', label: 'Auto' },
]
const ONOFF_CHOICES: DropdownChoice[] = [{ id: 'toggle', label: 'Toggle' }, { id: 'on', label: 'On' }, { id: 'off', label: 'Off' }]
const WHITE = combineRgb(255, 255, 255)
const RED = combineRgb(190, 18, 60)
const GREEN = combineRgb(21, 128, 61)
const AMBER = combineRgb(180, 83, 9)

const EMPTY: ServerState = { presets: [], lastPreset: null, stacks: [], armed: [], outputs: [], hold: false, ftb: false }

class KartCupInstance extends InstanceBase<Config> {
  private config: Config = { host: '127.0.0.1', port: 8080 }
  private api = new KartCupApi(() => baseUrl(this.config.host, this.config.port))
  private st: ServerState = EMPTY
  private shape = ''
  private timer: ReturnType<typeof setInterval> | null = null
  private online = false

  async init(config: Config): Promise<void> {
    this.config = config
    this.rebuild()
    this.startPolling()
  }

  async configUpdated(config: Config): Promise<void> {
    this.config = config
    this.shape = ''
    void this.poll()
  }

  async destroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  getConfigFields(): SomeCompanionConfigField[] {
    return [
      { type: 'textinput', id: 'host', label: 'Control server IP / host', width: 8, default: '127.0.0.1' },
      { type: 'number', id: 'port', label: 'Port', width: 4, min: 1, max: 65535, default: 8080 },
    ]
  }

  private startPolling(): void {
    this.timer = setInterval(() => { void this.poll() }, 1000)
    void this.poll()
  }

  private async poll(): Promise<void> {
    try {
      this.apply(await this.api.state())
      if (!this.online) { this.online = true; this.updateStatus(InstanceStatus.Ok) }
    } catch (e) {
      if (this.online || this.shape === '') { this.online = false; this.updateStatus(InstanceStatus.ConnectionFailure, (e as Error).message) }
    }
  }

  private apply(next: ServerState): void {
    const shape = JSON.stringify([next.presets, next.outputs, next.stacks.map((k) => [k.id, k.name, k.cues])])
    this.st = next
    if (shape !== this.shape) { this.shape = shape; this.rebuild() }
    const values: Record<string, string | number> = {
      preset_count: next.presets.length,
      armed_outputs: next.outputs.filter((o) => next.armed.includes(o.id)).map((o) => o.name).join(', '),
    }
    for (const k of next.stacks) {
      const name = (id: string | null) => next.presets.find((p) => p.id === k.cues.find((c) => c.id === id)?.presetId)?.name ?? ''
      const standby = k.selected ?? k.cues[k.cues.findIndex((c) => c.id === k.current) + 1]?.id ?? null
      values[`${k.id}_pgm`] = name(k.current)
      values[`${k.id}_pvw`] = name(standby)
    }
    this.setVariableValues(values)
    this.checkFeedbacks('preset_loaded', 'cue_state', 'output_armed', 'hold_on', 'ftb_on')
  }

  private async send(cmd: Record<string, unknown>): Promise<void> {
    try { await this.api.command(cmd) } catch (e) { this.log('error', `Command failed: ${(e as Error).message}`) }
    void this.poll()
  }

  private defineVariables(): void {
    this.setVariableDefinitions([
      { variableId: 'preset_count', name: 'Number of presets' },
      { variableId: 'armed_outputs', name: 'Armed output names' },
      ...this.st.stacks.flatMap((k) => [
        { variableId: `${k.id}_pgm`, name: `${k.name}: preset on air (PGM)` },
        { variableId: `${k.id}_pvw`, name: `${k.name}: preset standing by (PVW)` },
      ]),
    ])
  }

  /** Dropdown choices and presets depend on the server's preset/output lists, so rebuild when those change. */
  private rebuild(): void {
    this.defineVariables()
    const presets: DropdownChoice[] = this.st.presets.map((p) => ({ id: p.id, label: p.name }))
    const stackChoices: DropdownChoice[] = this.st.stacks.map((k) => ({ id: k.id, label: k.name }))
    const cueChoices: DropdownChoice[] = this.st.stacks.flatMap((k) => k.cues.map((c, i) => ({
      id: cueKey(k.id, c.id),
      label: `${k.name} · ${i + 1}. ${this.st.presets.find((p) => p.id === c.presetId)?.name ?? '?'} (${c.take ?? 'load'})`,
    })))
    const stackOpt = { type: 'dropdown' as const, id: 'stack', label: 'Cue stack', choices: stackChoices, default: stackChoices[0]?.id ?? '' }
    const cueOpt = { type: 'dropdown' as const, id: 'cue', label: 'Cue', choices: cueChoices, default: cueChoices[0]?.id ?? '' }
    const outputs: DropdownChoice[] = this.st.outputs.map((o) => ({ id: o.id, label: o.name }))
    const presetOpt = { type: 'dropdown' as const, id: 'preset', label: 'Preset', choices: presets, default: presets[0]?.id ?? '' }
    const outputOpt = { type: 'dropdown' as const, id: 'output', label: 'Output', choices: outputs, default: outputs[0]?.id ?? '' }
    const takeOpt = { type: 'dropdown' as const, id: 'take', label: 'Take', choices: TAKE_CHOICES, default: 'none' }

    const sourceOpt = { type: 'dropdown' as const, id: 'source', label: 'Source', choices: [{ id: 'pvw', label: 'PVW (preview)' }, { id: 'pgm', label: 'PGM (on air)' }], default: 'pvw' }
    const actions: CompanionActionDefinitions = {
      save_preset: {
        name: 'Save new preset from PVW / PGM', options: [{ type: 'textinput', id: 'name', label: 'Preset name', default: 'New preset' }, sourceOpt],
        callback: async (a) => { await this.send(savePresetCommand(a.options.name, a.options.source)) },
      },
      overwrite_preset: {
        name: 'Overwrite preset from PVW / PGM', options: [presetOpt, sourceOpt],
        callback: async (a) => { await this.send(overwritePresetCommand(String(a.options.preset), a.options.source)) },
      },
      recall: {
        name: 'Recall preset', options: [presetOpt, takeOpt],
        callback: async (a) => { await this.send(recallCommand(String(a.options.preset), a.options.take)) },
      },
      go: {
        name: 'GO: fire the standby cue (PVW to PGM)', options: [stackOpt],
        callback: async (a) => { await this.send({ type: 'goStack', stackId: String(a.options.stack) }) },
      },
      select_step: {
        name: 'Move standby cue (PVW) next / previous',
        options: [stackOpt, { type: 'dropdown', id: 'direction', label: 'Direction', choices: [{ id: 'next', label: 'Next' }, { id: 'prev', label: 'Previous' }], default: 'next' }],
        callback: async (a) => { await this.send(stepSelectionCommand(String(a.options.stack), a.options.direction)) },
      },
      select_cue: {
        name: 'Select cue (load into PVW)', options: [cueOpt],
        callback: async (a) => { const c = cueActionCommand('selectCue', a.options.cue); if (c) await this.send(c) },
      },
      fire_cue: {
        name: 'Fire a specific cue (to PGM)', options: [cueOpt],
        callback: async (a) => { const c = cueActionCommand('fireCue', a.options.cue); if (c) await this.send(c) },
      },
      rewind: {
        name: 'Rewind cue stack', options: [stackOpt],
        callback: async (a) => { await this.send({ type: 'resetStack', id: String(a.options.stack) }) },
      },
      take: {
        name: 'Take armed outputs',
        options: [{ type: 'dropdown', id: 'mode', label: 'Mode', choices: [{ id: 'cut', label: 'Cut' }, { id: 'auto', label: 'Auto' }], default: 'cut' }],
        callback: async (a) => { await this.send(takeCommand(a.options.mode)) },
      },
      arm: {
        name: 'Arm output', options: [outputOpt, { type: 'dropdown', id: 'mode', label: 'State', choices: ONOFF_CHOICES, default: 'toggle' }],
        callback: async (a) => { await this.send(armCommand(this.st.armed, String(a.options.output), a.options.mode)) },
      },
      arm_all: {
        name: 'Arm all outputs', options: [],
        callback: async () => { await this.send({ type: 'arm', outputIds: this.st.outputs.map((o) => o.id) }) },
      },
      hold: {
        name: 'Hold slate', options: [{ type: 'dropdown', id: 'mode', label: 'State', choices: ONOFF_CHOICES, default: 'toggle' }],
        callback: async (a) => { await this.send({ type: 'hold', on: resolveOnOff(a.options.mode, this.st.hold) }) },
      },
      clear: { name: 'Clear graphics', options: [], callback: async () => { await this.send({ type: 'clear' }) } },
      ftb: {
        name: 'Fade to black', options: [{ type: 'dropdown', id: 'mode', label: 'State', choices: ONOFF_CHOICES, default: 'toggle' }],
        callback: async (a) => { await this.send({ type: 'ftb', on: resolveOnOff(a.options.mode, this.st.ftb) }) },
      },
    }
    this.setActionDefinitions(actions)

    const lit = { bgcolor: RED, color: WHITE }
    const feedbacks: CompanionFeedbackDefinitions = {
      preset_loaded: {
        type: 'boolean', name: 'Preset was last recalled', defaultStyle: lit, options: [presetOpt],
        callback: (f) => this.st.lastPreset !== null && this.st.lastPreset === f.options.preset,
      },
      cue_state: {
        type: 'boolean', name: 'Cue is on air (PGM) or standing by (PVW)', defaultStyle: lit,
        options: [cueOpt, { type: 'dropdown', id: 'state', label: 'State', choices: [{ id: 'pgm', label: 'PGM (on air)' }, { id: 'pvw', label: 'PVW (standby)' }], default: 'pgm' }],
        callback: (f) => cueState(this.st.stacks, f.options.cue) === f.options.state,
      },
      output_armed: {
        type: 'boolean', name: 'Output is armed', defaultStyle: { bgcolor: AMBER, color: WHITE }, options: [outputOpt],
        callback: (f) => this.st.armed.includes(String(f.options.output)),
      },
      hold_on: { type: 'boolean', name: 'Hold slate is on', defaultStyle: lit, options: [], callback: () => this.st.hold },
      ftb_on: { type: 'boolean', name: 'Fade to black is on', defaultStyle: lit, options: [], callback: () => this.st.ftb },
    }
    this.setFeedbackDefinitions(feedbacks)

    const defs: CompanionPresetDefinitions = {}
    const button = (category: string, name: string, text: string, down: { actionId: string; options: Record<string, string> }[], feedbacks: { feedbackId: string; options: Record<string, string> }[] = [], bgcolor = combineRgb(30, 41, 59)): CompanionPresetDefinitions[string] => ({
      type: 'button', category, name, style: { text, size: 'auto', color: WHITE, bgcolor },
      steps: [{ down, up: [] }],
      feedbacks: feedbacks.map((f) => ({ ...f, style: { bgcolor: f.feedbackId === 'output_armed' ? AMBER : RED, color: WHITE } })),
    })
    for (const p of this.st.presets) {
      defs[`recall_${p.id}`] = button('Presets', `Recall ${p.name}`, p.name, [{ actionId: 'recall', options: { preset: p.id, take: 'none' } }], [{ feedbackId: 'preset_loaded', options: { preset: p.id } }])
      defs[`go_${p.id}`] = button('Presets (cut to air)', `Recall + cut ${p.name}`, `${p.name}\\nCUT`, [{ actionId: 'recall', options: { preset: p.id, take: 'cut' } }], [{ feedbackId: 'preset_loaded', options: { preset: p.id } }])
    }
    for (const k of this.st.stacks) {
      defs[`go_${k.id}`] = button(`Cue stack: ${k.name}`, `GO ${k.name}`, `GO\\n$(${this.label}:${k.id}_pvw)`, [{ actionId: 'go', options: { stack: k.id } }], [], GREEN)
      defs[`prev_${k.id}`] = button(`Cue stack: ${k.name}`, `Select previous ${k.name}`, 'PVW\\n◀', [{ actionId: 'select_step', options: { stack: k.id, direction: 'prev' } }])
      defs[`next_${k.id}`] = button(`Cue stack: ${k.name}`, `Select next ${k.name}`, 'PVW\\n▶', [{ actionId: 'select_step', options: { stack: k.id, direction: 'next' } }])
      defs[`rewind_${k.id}`] = button(`Cue stack: ${k.name}`, `Rewind ${k.name}`, 'REWIND', [{ actionId: 'rewind', options: { stack: k.id } }])
      k.cues.forEach((c, i) => {
        const key = cueKey(k.id, c.id)
        const label = `${i + 1}. ${this.st.presets.find((p) => p.id === c.presetId)?.name ?? '?'}`
        defs[`cue_${c.id}`] = {
          type: 'button', category: `Cues: ${k.name}`, name: label, style: { text: `${label}\\n${(c.take ?? 'load').toUpperCase()}`, size: 'auto', color: WHITE, bgcolor: combineRgb(30, 41, 59) },
          steps: [{ down: [{ actionId: 'select_cue', options: { cue: key } }], up: [] }],
          feedbacks: [
            { feedbackId: 'cue_state', options: { cue: key, state: 'pgm' }, style: { bgcolor: RED, color: WHITE } },
            { feedbackId: 'cue_state', options: { cue: key, state: 'pvw' }, style: { bgcolor: GREEN, color: WHITE } },
          ],
        }
      })
    }
    defs.take_cut = button('Take', 'Take (cut)', 'CUT', [{ actionId: 'take', options: { mode: 'cut' } }], [], GREEN)
    defs.take_auto = button('Take', 'Take (auto)', 'AUTO', [{ actionId: 'take', options: { mode: 'auto' } }], [], GREEN)
    for (const o of this.st.outputs) {
      defs[`arm_${o.id}`] = button('Arm', `Arm ${o.name}`, o.name, [{ actionId: 'arm', options: { output: o.id, mode: 'toggle' } }], [{ feedbackId: 'output_armed', options: { output: o.id } }])
    }
    defs.arm_all = button('Arm', 'Arm all', 'ARM\\nALL', [{ actionId: 'arm_all', options: {} }])
    defs.hold = button('Emergency', 'Hold', 'HOLD', [{ actionId: 'hold', options: { mode: 'toggle' } }], [{ feedbackId: 'hold_on', options: {} }])
    defs.clear = button('Emergency', 'Clear', 'CLEAR', [{ actionId: 'clear', options: {} }])
    defs.ftb = button('Emergency', 'Fade to black', 'FTB', [{ actionId: 'ftb', options: { mode: 'toggle' } }], [{ feedbackId: 'ftb_on', options: {} }])
    this.setPresetDefinitions(defs)
  }
}

runEntrypoint(KartCupInstance, [])

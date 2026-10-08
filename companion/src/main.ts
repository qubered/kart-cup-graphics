import {
  combineRgb, InstanceBase, InstanceStatus, runEntrypoint,
  type CompanionActionDefinitions, type CompanionFeedbackDefinitions, type CompanionPresetDefinitions,
  type DropdownChoice, type SomeCompanionConfigField,
} from '@companion-module/base'
import { cueActionStandalone, setActiveMatchCommand, showSceneCommand, splitWinCommands, tournamentVars, type TournamentScene, armCommand, overwritePresetCommand, savePresetCommand, baseUrl, cueActionCommand, cueKey, cueState, KartCupApi, recallCommand, resolveOnOff, stepSelectionCommand, takeCommand, type ServerState } from './api.js'

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
      const next = await this.api.state()
      // Servers that do not list the tournament in /api/presets still expose it through /api/export.
      if (next.tournament === undefined) next.tournament = await this.api.exportedTournament().catch(() => null)
      this.apply(next)
      if (!this.online) { this.online = true; this.updateStatus(InstanceStatus.Ok) }
    } catch (e) {
      if (this.online || this.shape === '') { this.online = false; this.updateStatus(InstanceStatus.ConnectionFailure, (e as Error).message) }
    }
  }

  private apply(next: ServerState): void {
    const shape = JSON.stringify([next.presets, next.outputs, next.stacks.map((k) => [k.id, k.name, k.cues]), next.tournament?.matches.map((m) => [m.id, m.label, m.round]) ?? null])
    this.st = next
    if (shape !== this.shape) { this.shape = shape; this.rebuild() }
    const values: Record<string, string | number> = {
      preset_count: next.presets.length,
      armed_outputs: next.outputs.filter((o) => next.armed.includes(o.id)).map((o) => o.name).join(', '),
    }
    Object.assign(values, tournamentVars(next.tournament))
    for (const m of next.tournament?.matches ?? []) { values[`match_${m.id}_status`] = m.status; values[`match_${m.id}_winner`] = m.winner }
    for (const k of next.stacks) {
      const name = (id: string | null) => next.presets.find((p) => p.id === k.cues.find((c) => c.id === id)?.presetId)?.name ?? ''
      const standby = k.selected ?? k.cues[k.cues.findIndex((c) => c.id === k.current) + 1]?.id ?? null
      values[`${k.id}_pgm`] = name(k.current)
      values[`${k.id}_pvw`] = name(standby)
    }
    this.setVariableValues(values)
    this.checkFeedbacks('preset_loaded', 'cue_state', 'output_armed', 'hold_on', 'ftb_on', 'match_active', 'match_status', 'match_has_winner')
  }

  private async send(cmd: Record<string, unknown>): Promise<void> {
    try { await this.api.command(cmd) } catch (e) { this.log('error', `Command failed: ${(e as Error).message}`) }
    void this.poll()
  }

  private defineVariables(): void {
    this.setVariableDefinitions([
      { variableId: 'preset_count', name: 'Number of presets' },
      { variableId: 'armed_outputs', name: 'Armed output names' },
      { variableId: 'tournament_name', name: 'Tournament name' },
      { variableId: 'active_match_label', name: 'Active match label' },
      { variableId: 'active_match_status', name: 'Active match status (pending / live / done)' },
      { variableId: 'active_match_winner', name: 'Active match winner name' },
      ...(this.st.tournament?.matches ?? []).flatMap((m) => [
        { variableId: `match_${m.id}_status`, name: `${m.label}: status` },
        { variableId: `match_${m.id}_winner`, name: `${m.label}: winner name` },
      ]),
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

    const matches = this.st.tournament?.matches ?? []
    const matchChoices: DropdownChoice[] = matches.map((m) => ({ id: m.id, label: m.label }))
    const matchOpt = { type: 'dropdown' as const, id: 'match', label: 'Match', choices: matchChoices, default: matchChoices[0]?.id ?? '' }
    const refChoices: DropdownChoice[] = [{ id: 'active', label: 'Active match' }, { id: 'previous', label: 'Previous match' }, ...matchChoices]
    const refOpt = { type: 'dropdown' as const, id: 'ref', label: 'Match shown', choices: refChoices, default: 'active' }
    const partChoices: DropdownChoice[] = [{ id: 'full', label: 'Full (hero + scoreboard)' }, { id: 'hero', label: 'Hero (winner) only' }, { id: 'board', label: 'Scoreboard only' }]
    const partOpt = { type: 'dropdown' as const, id: 'part', label: 'Part', choices: partChoices, default: 'full' }
    const winSceneChoices: DropdownChoice[] = [{ id: 'raceWin', label: 'Race win' }, { id: 'cupWin', label: 'Cup win' }]
    const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b)
    const setChoices: DropdownChoice[] = [{ id: 'all', label: 'All matches' }, ...rounds.map((r) => ({ id: `round:${r}`, label: `Round ${r + 1}` }))]
    const sceneAction = (scene: TournamentScene, name: string, extra: typeof outputOpt[] | Record<string, unknown>[] = []) => ({
      name, options: [outputOpt, ...extra] as never,
      callback: async (a: { options: Record<string, unknown> }) => {
        await this.send(showSceneCommand(String(a.options.output), scene, { part: a.options.part, matchRef: a.options.ref, matches: a.options.set, range: a.options.range }))
      },
    })
    const splitAction = (scene: 'raceWin' | 'cupWin', name: string) => ({
      name,
      options: [
        { type: 'dropdown' as const, id: 'hero', label: 'Hero (winner) output', choices: outputs, default: outputs[0]?.id ?? '' },
        { type: 'dropdown' as const, id: 'board', label: 'Scoreboard output', choices: outputs, default: outputs[1]?.id ?? outputs[0]?.id ?? '' },
        refOpt,
      ],
      callback: async (a: { options: Record<string, unknown> }) => {
        for (const c of splitWinCommands(scene, String(a.options.hero), String(a.options.board), a.options.ref)) await this.send(c)
      },
    })
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
      next_match: { name: 'Tournament: next match', options: [], callback: async () => { await this.send({ type: 'nextMatch' }) } },
      set_active_match: {
        name: 'Tournament: set active match', options: [matchOpt],
        callback: async (a) => { const c = setActiveMatchCommand(a.options.match); if (c) await this.send(c) },
      },
      show_race_win: sceneAction('raceWin', 'Tournament: show race win', [partOpt, refOpt]),
      show_cup_win: sceneAction('cupWin', 'Tournament: show cup win', [partOpt, refOpt]),
      show_bracket: sceneAction('bracket', 'Tournament: show bracket'),
      show_matches: sceneAction('matches', 'Tournament: show matches', [
        { type: 'dropdown', id: 'set', label: 'Matches', choices: setChoices, default: 'all' },
        { type: 'textinput', id: 'range', label: 'Range, 1-based (e.g. 1-2; blank = no slice)', default: '' },
      ]),
      split_race_win: splitAction('raceWin', 'Tournament: split race win across two outputs'),
      split_cup_win: splitAction('cupWin', 'Tournament: split cup win across two outputs'),
      run_cue_action: {
        name: 'Tournament: run a cue action (next race / next match / reset stack)',
        options: [
          { type: 'dropdown', id: 'action', label: 'Action', choices: [{ id: 'nextRace', label: 'Next race' }, { id: 'nextMatch', label: 'Next match (resets stacks)' }, { id: 'resetStack', label: 'Reset cue stack' }], default: 'nextMatch' },
          stackOpt,
        ],
        callback: async (a) => { const c = cueActionStandalone(a.options.action, a.options.stack); if (c) await this.send(c) },
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
      match_active: {
        type: 'boolean', name: 'Tournament: match is the active match', defaultStyle: lit, options: [matchOpt],
        callback: (f) => this.st.tournament?.activeMatchId === f.options.match,
      },
      match_status: {
        type: 'boolean', name: 'Tournament: match has status', defaultStyle: { bgcolor: GREEN, color: WHITE },
        options: [matchOpt, { type: 'dropdown', id: 'status', label: 'Status', choices: [{ id: 'pending', label: 'Pending' }, { id: 'live', label: 'Live' }, { id: 'done', label: 'Done' }], default: 'done' }],
        callback: (f) => this.st.tournament?.matches.find((m) => m.id === f.options.match)?.status === f.options.status,
      },
      match_has_winner: {
        type: 'boolean', name: 'Tournament: match has a winner', defaultStyle: { bgcolor: GREEN, color: WHITE }, options: [matchOpt],
        callback: (f) => !!this.st.tournament?.matches.find((m) => m.id === f.options.match)?.winner,
      },
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
    if (this.st.tournament) {
      const cat = 'Tournament'
      defs.t_next_match = button(cat, 'Next match', 'NEXT\\nMATCH', [{ actionId: 'next_match', options: {} }], [], GREEN)
      const out0 = String(outputs[0]?.id ?? '')
      defs.t_race_win = button(cat, 'Race win', 'RACE\\nWIN', [{ actionId: 'show_race_win', options: { output: out0, part: 'full', ref: 'active' } }])
      defs.t_cup_win = button(cat, 'Cup win', 'CUP\\nWIN', [{ actionId: 'show_cup_win', options: { output: out0, part: 'full', ref: 'active' } }])
      defs.t_bracket = button(cat, 'Bracket', 'BRACKET', [{ actionId: 'show_bracket', options: { output: out0 } }])
      defs.t_matches = button(cat, 'Matches', 'MATCHES', [{ actionId: 'show_matches', options: { output: out0, set: 'all', range: '' } }])
      for (const m of this.st.tournament.matches) {
        defs[`t_match_${m.id}`] = button(cat, `Make ${m.label} active`, `${m.label}\\n$(${this.label}:match_${m.id}_winner)`, [{ actionId: 'set_active_match', options: { match: m.id } }], [{ feedbackId: 'match_active', options: { match: m.id } }])
      }
    }
    this.setPresetDefinitions(defs)
  }
}

runEntrypoint(KartCupInstance, [])

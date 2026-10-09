import { test, expect, type Locator, type Page } from '@playwright/test'
import { command, state, resetShow, openPage } from './helpers'

// The rundown rail of the Live page: Run / Edit lock, GO, cue editing, drag, Undo, rundown switcher.

test.beforeEach(async () => {
  await resetShow()
  // Reset keeps the preset library and the stacks; start each test from empty ones.
  const s = await state()
  for (const k of s.stacks) await command({ type: 'deleteStack', id: k.id })
  for (const p of s.presets) await command({ type: 'deletePreset', id: p.id })
})

// ---- helpers ----

/** preset-1 Lineup, preset-2 Standings, preset-3 Winner; Wide armed; Preview ends on Winner. */
async function seedLooks() {
  await command({ type: 'arm', outputIds: ['wide'] })
  for (const [name, scene] of [['Lineup', 'lineup'], ['Standings', 'standings'], ['Winner', 'winner']] as const) {
    await command({ type: 'setLayers', outputId: 'wide', patch: { scene } })
    await command({ type: 'savePreset', name })
  }
}
/** The three Looks plus stack-1 "Run" with one cue per entry of `looks` (preset numbers), cue-1 .. cue-n. */
async function seedRundown(looks = [1, 2, 3, 1], takes: ('cut' | 'auto' | null)[] = ['cut', 'auto', 'auto', 'cut']) {
  await seedLooks()
  await command({ type: 'createStack', name: 'Run' })
  for (const [i, n] of looks.entries()) await command({ type: 'addCue', stackId: 'stack-1', presetId: `preset-${n}`, take: takes[i] ?? 'auto' })
}
async function openLive(page: Page) {
  await page.goto('/control')
  await openPage(page, 'live')
  await expect(page.locator('[data-rail]')).toBeVisible()
}
const edit = (page: Page) => page.locator('[data-edit-toggle=edit]').click()
const run = (page: Page) => page.locator('[data-edit-toggle=run]').click()
const stack = async (i = 0) => (await state()).stacks[i]
const cueOrder = async () => (await stack()).cues.map((c) => c.id)
/** Wait until the rows on screen are in this order (the server state can be ahead of the page by a frame). */
const expectRows = (page: Page, ids: string[]) => expect.poll(() => page.locator('[data-cue]').evaluateAll((els) => els.map((e) => e.getAttribute('data-cue')))).toEqual(ids)
const looksOf = async () => (await stack()).cues.map((c) => c.presetId)
/** Ctrl+Z, from a page that is not in a text field (Undo ignores those, which keep their own undo). */
async function undoKey(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('Control+z')
}
/** The top-bar Undo button. */
const undoButton = (page: Page) => page.locator('[data-undo]').last()
/** Drag with real mouse events from the centre of `from` to a point. */
async function dragTo(page: Page, from: Locator, x: number, y: number) {
  const b = (await from.boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(x, y, { steps: 12 })
  await page.mouse.up()
}
/** A point just below the middle of a row: dropping there inserts after it. */
async function belowRow(row: Locator) {
  const b = (await row.boundingBox())!
  return { x: b.x + 120, y: b.y + b.height - 4 }
}

// ---- migrated from presets.spec.ts ----

test('build a stack with a reused preset and GO through it', async ({ page }) => {
  await command({ type: 'arm', outputIds: ['wide'] })
  await command({ type: 'setLayers', outputId: 'wide', patch: { scene: 'lineup' } })
  await command({ type: 'savePreset', name: 'Lineup' })
  await command({ type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } })
  await command({ type: 'savePreset', name: 'Standings' })
  await openLive(page)
  // no rundown yet: the rail offers to create one (it opens in Edit mode)
  await expect(page.locator('[data-empty]')).toContainText('No rundown yet')
  await page.locator('[data-new-rundown]').click()
  await expect(page.locator('[data-stack=stack-1]')).toBeVisible()
  await expect(page.locator('[data-edit-toggle=edit]')).toHaveAttribute('aria-pressed', 'true')
  // build it from Preview, then point the cues at the saved Looks (cue 3 reuses Lineup)
  for (let n = 1; n <= 3; n++) {
    await page.locator('[data-add-from-preview]').click()
    await expect(page.locator('[data-cue]')).toHaveCount(n)
  }
  const pick = async (cue: string, look: string, take: 'cut' | 'auto') => {
    await page.locator(`[data-cue=${cue}] [data-open]`).click()
    await page.locator(`[data-cue-editor=${cue}] select[name=cuePreset]`).selectOption(look)
    await page.locator(`[data-cue-editor=${cue}] [data-take=${take}]`).click()
  }
  await pick('cue-1', 'preset-1', 'cut')
  await pick('cue-2', 'preset-2', 'auto')
  await pick('cue-3', 'preset-1', 'auto')
  await expect.poll(async () => (await stack()).cues.map((c) => [c.presetId, c.take])).toEqual([['preset-1', 'cut'], ['preset-2', 'auto'], ['preset-1', 'auto']])
  await run(page)
  await page.locator('[data-cue=cue-1] [data-select]').click()
  await expect.poll(async () => (await state()).layers.wide.scene).toBe('lineup')
  expect((await state()).program.wide.view.scene).toBeNull()
  await page.locator('[data-go]').click()
  await expect.poll(async () => (await state()).program.wide.view.scene?.kind).toBe('lineup')
  await expect.poll(async () => (await state()).layers.wide.scene).toBe('standings')
  await page.locator('[data-go]').click()
  await expect.poll(async () => (await state()).program.wide.view.scene?.kind).toBe('standings')
  expect((await state()).program.wide.mode).toBe('auto')
})

test('a cue can override the preset scope', async ({ page }) => {
  await command({ type: 'setPlayer', index: 0, patch: { name: 'SAM' } })
  await command({ type: 'savePreset', name: 'Sam' })
  await command({ type: 'createStack', name: 'Run' })
  await command({ type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: null })
  await openLive(page)
  await edit(page)
  await page.locator('[data-cue=cue-1] [data-open]').click()
  await page.locator('[data-cue-editor=cue-1] [data-recalls]').click()
  const chip = page.locator('[data-cue-scope=cue-1] [data-scope=players]')
  await chip.click()
  await chip.click()
  await expect.poll(async () => (await state()).stacks[0].cues[0].scope).toEqual({ players: false })
  await command({ type: 'setPlayer', index: 0, patch: { name: 'OTHER' } })
  await run(page)
  await page.locator('[data-cue=cue-1] [data-select]').click()
  await expect.poll(async () => (await state()).stacks[0].selected).toBe('cue-1')
  expect((await state()).draft.players[0].name).toBe('OTHER')
  await edit(page)
  await page.locator('[data-cue=cue-1] [data-open]').click()
  await page.locator('[data-cue-editor=cue-1] [data-recalls]').click()
  await expect(page.locator('[data-cue-editor=cue-1] [data-recalls]')).toContainText('(custom)')
  await chip.click()
  await expect.poll(async () => (await state()).stacks[0].cues[0].scope).toBeUndefined()
  await expect(page.locator('[data-cue-editor=cue-1] [data-recalls]')).not.toContainText('(custom)')
})

// ---- Run and Edit ----

test('Run mode fires, Edit mode locks GO and the G key; only Edit shows destructive controls', async ({ page }) => {
  await seedRundown()
  await openLive(page)
  const go = page.locator('[data-go]')
  await expect(go).toBeEnabled()
  await expect(go).toContainText('Fires cue 1 · CUT')
  await expect(page.locator('[data-grip], [data-remove]')).toHaveCount(0)
  await page.keyboard.press('g')
  await expect.poll(async () => (await stack()).current).toBe('cue-1')
  await expect(page.locator('[data-cue=cue-1]')).toContainText('ON AIR')

  await edit(page)
  await expect(page.locator('text=EDITING — GO is locked')).toBeVisible()
  await expect(go).toBeDisabled()
  await expect(go).toContainText('Locked while editing')
  await expect(page.locator('[data-grip]')).toHaveCount(4)
  await expect(page.locator('[data-remove]')).toHaveCount(4)
  await page.keyboard.press('g')
  await page.keyboard.press('G')
  await page.waitForTimeout(400)
  expect((await stack()).current).toBe('cue-1')

  await run(page)
  await expect(go).toBeEnabled()
  await expect(page.locator('[data-grip], [data-remove]')).toHaveCount(0)
  await page.keyboard.press('g')
  await expect.poll(async () => (await stack()).current).toBe('cue-2')
})

test('tapping a row stands the cue by and loads its Look into Preview', async ({ page }) => {
  await seedRundown()
  await openLive(page)
  await expect(page.locator('[data-position]')).toHaveText('1/4')
  await expect(page.locator('[data-cue=cue-1]')).toContainText('NEXT')
  await page.locator('[data-cue=cue-3] [data-select]').click()
  await expect.poll(async () => (await stack()).selected).toBe('cue-3')
  expect((await state()).layers.wide.scene).toBe('winner')
  expect((await state()).program.wide.view.scene).toBeNull()
  await expect(page.locator('[data-cue=cue-3]')).toContainText('NEXT')
  await expect(page.locator('[data-cue=cue-1]')).not.toContainText('NEXT')
  await expect(page.locator('[data-go]')).toContainText('Fires cue 3 · AUTO')
  await expect(page.locator('[data-go]')).toContainText('Winner')
  await expect(page.locator('[data-position]')).toHaveText('3/4')
  await page.locator('[data-cue=cue-2] [data-select]').click()
  await expect.poll(async () => (await stack()).selected).toBe('cue-2')
  expect((await state()).layers.wide.scene).toBe('standings')
})

test('tapping a row over unsaved Preview changes says so, and Undo brings them back', async ({ page }) => {
  await seedRundown()
  await command({ type: 'recallPreset', id: 'preset-1' })
  await command({ type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } }) // Preview no longer matches its Look
  await openLive(page)
  await page.locator('[data-cue=cue-3] [data-select]').click()
  await expect.poll(async () => (await stack()).selected).toBe('cue-3')
  await expect(undoButton(page)).toBeEnabled() // the discarded Preview can be brought back
  expect((await state()).layers.wide.scene).toBe('winner')
  await undoButton(page).click()
  await expect.poll(async () => (await state()).layers.wide.scene).toBe('standings')
  expect((await state()).lastPreset).toBe('preset-1')
})

test('tapping a row over an unchanged Preview leaves nothing to undo', async ({ page }) => {
  await seedRundown()
  await command({ type: 'recallPreset', id: 'preset-1' })
  await openLive(page)
  await page.locator('[data-cue=cue-2] [data-select]').click()
  await expect.poll(async () => (await stack()).selected).toBe('cue-2')
  await page.waitForTimeout(300)
  await expect(undoButton(page)).toBeDisabled()
})

test('Enter on a focused row selects it and does not take', async ({ page }) => {
  await seedRundown()
  await openLive(page)
  await page.locator('[data-cue=cue-2] [data-select]').focus()
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await stack()).selected).toBe('cue-2')
  await page.locator('[data-cue=cue-3] [data-select]').focus()
  await page.keyboard.press(' ')
  await expect.poll(async () => (await stack()).selected).toBe('cue-3')
  await page.waitForTimeout(300)
  expect((await state()).program.wide.view.scene).toBeNull()
  // a tapped row does not keep focus, so Space still takes
  await page.locator('[data-cue=cue-1] [data-select]').click()
  await expect.poll(async () => (await stack()).selected).toBe('cue-1')
  await page.keyboard.press(' ')
  await expect.poll(async () => (await state()).program.wide.mode).toBe('auto')
  expect((await state()).program.wide.view.scene?.kind).toBe('lineup')
})

test('Back, Skip and Rewind move the standby cue; GO stops at the end of the rundown', async ({ page }) => {
  await seedRundown()
  await openLive(page)
  const back = page.locator('[data-select-prev]'), skip = page.locator('[data-select-next]'), rewind = page.locator('[data-stack-rewind]'), go = page.locator('[data-go]')
  await expect(back).toBeDisabled()
  await expect(rewind).toBeDisabled()
  await skip.click()
  await expect.poll(async () => (await stack()).selected).toBe('cue-2')
  await skip.click()
  await expect.poll(async () => (await stack()).selected).toBe('cue-3')
  await back.click()
  await expect.poll(async () => (await stack()).selected).toBe('cue-2')
  expect((await state()).layers.wide.scene).toBe('standings')
  await go.click()
  await expect.poll(async () => (await stack()).current).toBe('cue-2')
  await expect.poll(async () => (await stack()).selected).toBe('cue-3')
  await expect(page.locator('[data-cue=cue-1]')).toHaveCSS('opacity', '0.5')
  await expect(page.locator('[data-cue=cue-2]')).toContainText('ON AIR')
  await rewind.click()
  await expect.poll(async () => (await stack()).current).toBeNull()
  await expect.poll(async () => (await stack()).selected).toBe('cue-1')
  expect((await state()).layers.wide.scene).toBe('lineup')
  await expect(page.locator('[data-position]')).toHaveText('1/4')
  // all the way through
  for (let i = 0; i < 4; i++) await go.click()
  await expect.poll(async () => (await stack()).current).toBe('cue-4')
  await expect(go).toBeDisabled()
  await expect(go).toContainText('End of rundown')
  await expect(go).toContainText('Rewind to start again')
  await expect(skip).toBeDisabled()
  await expect(back).toBeEnabled()
  await expect(page.locator('[data-position]')).toHaveText('4/4')
  await rewind.click()
  await expect(go).toBeEnabled()
  await expect(go).toContainText('Fires cue 1')
})

// ---- Edit: add, reorder, remove, editor ----

test('Add cue from Preview saves a Look and a cue in one step, and Undo removes both', async ({ page }) => {
  await seedRundown([1, 2])
  await command({ type: 'recallPreset', id: 'preset-2' })
  await openLive(page)
  await edit(page)
  const add = page.locator('[data-add-from-preview]')
  await expect(add).toContainText('Standings')
  await expect(add).not.toContainText('modified')
  await command({ type: 'setLayers', outputId: 'wide', patch: { scene: 'winner' } })
  await expect(add).toContainText('modified')
  const before = await state()
  await add.click()
  await expect.poll(async () => (await stack()).cues.length).toBe(3)
  const s = await state()
  expect(s.presets).toHaveLength(before.presets.length + 1)
  const fresh = s.presets[s.presets.length - 1]
  expect(s.stacks[0].cues[2]).toMatchObject({ presetId: fresh.id, take: 'auto' })
  expect(s.lastPreset).toBe(fresh.id)
  expect(fresh.name).toBe('Standings 2')
  expect(fresh.layers.wide.scene).toBe('winner')
  // the new cue's editor is open so Take can be set straight away
  await expect(page.locator(`[data-cue-editor=${s.stacks[0].cues[2].id}]`)).toBeVisible()
  await undoButton(page).click()
  await expect.poll(async () => (await stack()).cues.length).toBe(2)
  expect((await state()).presets).toHaveLength(before.presets.length)
})

test('drag a grip to reorder the rundown; Undo puts it back', async ({ page }) => {
  await seedRundown()
  await openLive(page)
  await edit(page)
  expect(await cueOrder()).toEqual(['cue-1', 'cue-2', 'cue-3', 'cue-4'])
  const to = await belowRow(page.locator('[data-cue=cue-3]'))
  await dragTo(page, page.locator('[data-cue=cue-1] [data-grip]'), to.x, to.y)
  await expect.poll(cueOrder).toEqual(['cue-2', 'cue-3', 'cue-1', 'cue-4'])
  await undoKey(page)
  await expect.poll(cueOrder).toEqual(['cue-1', 'cue-2', 'cue-3', 'cue-4'])
  // up: the last cue to the top
  const top = (await page.locator('[data-cue=cue-1]').boundingBox())!
  await dragTo(page, page.locator('[data-cue=cue-4] [data-grip]'), top.x + 120, top.y + 4)
  await expect.poll(cueOrder).toEqual(['cue-4', 'cue-1', 'cue-2', 'cue-3'])
  await expectRows(page, ['cue-4', 'cue-1', 'cue-2', 'cue-3'])
  // dropping where it already is changes nothing
  const own = (await page.locator('[data-cue=cue-4]').boundingBox())!
  await dragTo(page, page.locator('[data-cue=cue-4] [data-grip]'), own.x + 120, own.y + 6)
  await page.waitForTimeout(300)
  expect(await cueOrder()).toEqual(['cue-4', 'cue-1', 'cue-2', 'cue-3'])
})

test('the standby and on-air cues follow a reorder', async ({ page }) => {
  await seedRundown()
  await command({ type: 'goStack', stackId: 'stack-1' }) // cue-1 on air, cue-2 standby
  await openLive(page)
  await edit(page)
  const to = await belowRow(page.locator('[data-cue=cue-4]'))
  await dragTo(page, page.locator('[data-cue=cue-1] [data-grip]'), to.x, to.y)
  await expect.poll(cueOrder).toEqual(['cue-2', 'cue-3', 'cue-4', 'cue-1'])
  const k = await stack()
  expect(k.current).toBe('cue-1')
  expect(k.selected).toBe('cue-2')
  await expect(page.locator('[data-cue=cue-1]')).toContainText('ON AIR')
  await expect(page.locator('[data-cue=cue-2]')).toContainText('NEXT')
})

test('the arrow keys on a focused grip move the cue', async ({ page }) => {
  await seedRundown()
  await openLive(page)
  await edit(page)
  await page.locator('[data-cue=cue-2] [data-grip]').focus()
  await page.keyboard.press('ArrowDown')
  await expect.poll(cueOrder).toEqual(['cue-1', 'cue-3', 'cue-2', 'cue-4'])
  await expectRows(page, ['cue-1', 'cue-3', 'cue-2', 'cue-4'])
  await expect(page.locator('[data-cue=cue-2] [data-grip]')).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect.poll(cueOrder).toEqual(['cue-1', 'cue-2', 'cue-3', 'cue-4'])
  await expectRows(page, ['cue-1', 'cue-2', 'cue-3', 'cue-4'])
  await expect(page.locator('[data-cue=cue-2] [data-grip]')).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect.poll(cueOrder).toEqual(['cue-2', 'cue-1', 'cue-3', 'cue-4'])
  await expectRows(page, ['cue-2', 'cue-1', 'cue-3', 'cue-4'])
  await expect(page.locator('[data-cue=cue-2] [data-grip]')).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await page.waitForTimeout(200)
  expect(await cueOrder()).toEqual(['cue-2', 'cue-1', 'cue-3', 'cue-4'])
})

test('drag a Look from the library onto the rundown to add a cue', async ({ page }) => {
  await seedRundown([1, 2])
  await openLive(page)
  const grip = page.locator('[data-look=preset-3] .u-grip, [data-look=preset-3] [data-grip]').first()
  test.skip(await grip.count() === 0, 'needs the Looks library (centre column) to be present')
  await edit(page)
  const to = await belowRow(page.locator('[data-cue=cue-1]'))
  await dragTo(page, grip, to.x, to.y)
  await expect.poll(async () => (await stack()).cues.length).toBe(3)
  expect(await looksOf()).toEqual(['preset-1', 'preset-3', 'preset-2'])
  expect((await stack()).cues[1]).toMatchObject({ take: 'auto' })
  await undoKey(page)
  await expect.poll(async () => (await stack()).cues.length).toBe(2)
  expect(await looksOf()).toEqual(['preset-1', 'preset-2'])
})

test('remove a cue, then Undo it with the button and with Ctrl+Z', async ({ page }) => {
  await seedRundown([1, 2, 3], ['cut', 'auto', null])
  await command({ type: 'updateCue', stackId: 'stack-1', cueId: 'cue-2', action: 'nextRace', scope: { scores: true } })
  await openLive(page)
  const shape = async () => (await stack()).cues.map((c) => [c.presetId, c.take, c.action, c.scope])
  const original = await shape()
  await expect(page.locator('[data-cue]')).toHaveCount(3)
  await edit(page)
  await expect(page.locator('[data-remove]').first()).toHaveCSS('width', '44px')
  await page.locator('[data-cue=cue-2] [data-remove]').click()
  await expect(page.locator('[data-cue]')).toHaveCount(2)
  expect(await looksOf()).toEqual(['preset-1', 'preset-3'])
  await undoButton(page).click()
  await expect(page.locator('[data-cue]')).toHaveCount(3)
  expect(await shape()).toEqual(original)
  // keyboard
  await page.locator('[data-cue=cue-1] [data-remove]').click()
  await expect(page.locator('[data-cue]')).toHaveCount(2)
  await undoKey(page)
  await expect(page.locator('[data-cue]')).toHaveCount(3)
  expect(await shape()).toEqual(original)
})

test('the cue editor: Look, Take, After and Recalls, each undoable', async ({ page }) => {
  await seedRundown([1, 2], ['cut', 'auto'])
  await openLive(page)
  await edit(page)
  await page.locator('[data-cue=cue-1] [data-open]').click()
  const ed = page.locator('[data-cue-editor=cue-1]')
  await expect(ed).toContainText('Only this cue uses this Look')
  await expect(ed.locator('[data-recalls]')).toContainText('look + outputs armed')
  // only one editor is open at a time
  await page.locator('[data-cue=cue-2] [data-open]').click()
  await expect(page.locator('[data-cue-editor]')).toHaveCount(1)
  await page.locator('[data-cue=cue-1] [data-open]').click()
  await expect(ed).toBeVisible()

  await ed.locator('select[name=cuePreset]').selectOption('preset-3')
  await expect.poll(async () => (await stack()).cues[0].presetId).toBe('preset-3')
  await expect(page.locator('[data-cue=cue-1]')).toContainText('Winner')
  await undoKey(page)
  await expect.poll(async () => (await stack()).cues[0].presetId).toBe('preset-1')

  await ed.locator('[data-take=none]').click()
  await expect.poll(async () => (await stack()).cues[0].take).toBeNull()
  await expect(page.locator('[data-cue=cue-1]')).toContainText('RECALL')
  await ed.locator('[data-take=auto]').click()
  await expect.poll(async () => (await stack()).cues[0].take).toBe('auto')
  await ed.locator('[data-take=cut]').click()
  await expect.poll(async () => (await stack()).cues[0].take).toBe('cut')
  await undoKey(page)
  await expect.poll(async () => (await stack()).cues[0].take).toBe('auto')

  await ed.locator('select[name=cueAction]').selectOption('nextMatch')
  await expect.poll(async () => (await stack()).cues[0].action).toBe('nextMatch')
  await expect(page.locator('[data-cue=cue-1]')).toContainText('then next match')
  await undoKey(page)
  await expect.poll(async () => (await stack()).cues[0].action).toBeUndefined()
  await ed.locator('select[name=cueAction]').selectOption('resetStack')
  await expect.poll(async () => (await stack()).cues[0].action).toBe('resetStack')
  await ed.locator('select[name=cueAction]').selectOption('')
  await expect.poll(async () => (await stack()).cues[0].action).toBeUndefined()

  // recalls: the chips cycle inherit -> on -> off -> inherit, and Undo restores each step
  await ed.locator('[data-recalls]').click()
  const chip = page.locator('[data-cue-scope=cue-1] [data-scope=scores]')
  await expect(chip).not.toHaveClass(/on/)
  await chip.click()
  await expect.poll(async () => (await stack()).cues[0].scope).toEqual({ scores: true })
  await expect(chip).toHaveClass(/forced/)
  await expect(ed.locator('[data-recalls]')).toContainText('scores (custom)')
  await chip.click()
  await expect.poll(async () => (await stack()).cues[0].scope).toEqual({ scores: false })
  await undoKey(page)
  await expect.poll(async () => (await stack()).cues[0].scope).toEqual({ scores: true })
  await chip.click()
  await chip.click()
  await expect.poll(async () => (await stack()).cues[0].scope).toBeUndefined()
})

test('Make unique gives a cue its own copy of a shared Look, and Undo takes it back', async ({ page }) => {
  await seedRundown([1, 2, 1])
  await openLive(page)
  await edit(page)
  const presets = (await state()).presets.length
  await page.locator('[data-cue=cue-3] [data-open]').click()
  const ed = page.locator('[data-cue-editor=cue-3]')
  await expect(ed).toContainText('Used by 2 cues')
  await ed.locator('[data-make-unique]').click()
  await expect.poll(async () => (await state()).presets.length).toBe(presets + 1)
  const s = await state()
  const copy = s.presets.find((p) => p.name === 'Lineup copy')!
  expect(copy).toBeTruthy()
  expect(await looksOf()).toEqual(['preset-1', 'preset-2', copy.id])
  await expect(ed).toContainText('Only this cue uses this Look')
  await expect(page.locator('[data-cue=cue-3]')).toContainText('Lineup copy')
  await undoButton(page).click()
  await expect.poll(async () => (await state()).presets.length).toBe(presets)
  expect(await looksOf()).toEqual(['preset-1', 'preset-2', 'preset-1'])
  await expect(ed).toContainText('Used by 2 cues')
})

test('an empty rundown says what to do in each mode', async ({ page }) => {
  await command({ type: 'createStack', name: 'Blank' })
  await openLive(page)
  await expect(page.locator('[data-empty]')).toContainText('No cues yet')
  await expect(page.locator('[data-empty]')).toContainText('Switch to Edit')
  await expect(page.locator('[data-go]')).toBeDisabled()
  await expect(page.locator('[data-position]')).toHaveText('0/0')
  await edit(page)
  await expect(page.locator('[data-empty]')).toContainText('Add cue from Preview')
})

// ---- rundowns ----

test('switch, create, rename and delete rundowns (delete is two taps)', async ({ page }) => {
  await seedRundown([1, 2])
  await command({ type: 'createStack', name: 'Sponsors' })
  await openLive(page)
  await expect(page.locator('[data-stack=stack-1]')).toBeVisible()
  const menu = page.locator('[data-rundown-menu]')
  await menu.click()
  await expect(page.locator('[data-stack-tab=stack-1]')).toContainText('2 cues')
  await expect(page.locator('[data-stack-tab=stack-2]')).toContainText('0 cues')
  // switch
  await page.locator('[data-stack-tab=stack-2]').click()
  await expect(page.locator('[data-stack=stack-2]')).toBeVisible()
  await expect(menu).toContainText('Sponsors')
  await expect(page.locator('[data-rundown-list]')).toHaveCount(0)
  // GO and the G key follow the rundown that is shown
  await menu.click()
  await page.locator('[data-stack-tab=stack-1]').click()
  await expect(page.locator('[data-stack=stack-1]')).toBeVisible()
  await page.keyboard.press('g')
  await expect.poll(async () => (await stack(0)).current).toBe('cue-1')
  expect((await stack(1)).current).toBeNull()

  // new: created, shown, opened in Edit; Undo deletes it again
  await menu.click()
  await page.locator('[data-rundown-new]').click()
  await expect(page.locator('[data-stack=stack-3]')).toBeVisible()
  await expect(menu).toContainText('Rundown 3')
  await expect(page.locator('[data-edit-toggle=edit]')).toHaveAttribute('aria-pressed', 'true')
  expect((await state()).stacks.map((k) => k.name)).toEqual(['Run', 'Sponsors', 'Rundown 3'])
  await undoButton(page).click()
  await expect.poll(async () => (await state()).stacks.length).toBe(2)
  await expect(page.locator('[data-stack]')).toHaveAttribute('data-stack', 'stack-1')

  // rename
  await menu.click()
  await page.locator('[data-rundown-rename]').click()
  await page.locator('input[name=rundownName]').fill('Semi finals')
  await page.locator('input[name=rundownName]').press('Enter')
  await expect.poll(async () => (await stack(0)).name).toBe('Semi finals')
  await expect(menu).toContainText('Semi finals')

  // delete: the first tap only arms it (renaming leaves the menu open)
  await expect(page.locator('[data-rundown-list]')).toBeVisible()
  const del = page.locator('[data-rundown-delete]')
  await expect(del).toBeEnabled()
  await del.click()
  await expect(del).toContainText('Tap again')
  expect((await state()).stacks).toHaveLength(2)
  await del.click()
  await expect.poll(async () => (await state()).stacks.length).toBe(1)
  await expect(page.locator('[data-stack=stack-2]')).toBeVisible()
  // undo builds it again with its cues
  await undoButton(page).click()
  await expect.poll(async () => (await state()).stacks.length).toBe(2)
  const back = (await state()).stacks.find((k) => k.name === 'Semi finals')!
  expect(back.cues.map((c) => [c.presetId, c.take])).toEqual([['preset-1', 'cut'], ['preset-2', 'auto']])
  // the last rundown cannot be deleted
  await command({ type: 'deleteStack', id: back.id })
  await expect(page.locator('[data-stack]')).toHaveAttribute('data-stack', 'stack-2')
  await page.locator('[data-rundown-menu]').click()
  await expect(page.locator('[data-rundown-delete]')).toBeDisabled()
})

test('a two-tap delete disarms when the menu closes', async ({ page }) => {
  await command({ type: 'createStack', name: 'A' })
  await command({ type: 'createStack', name: 'B' })
  await openLive(page)
  await page.locator('[data-rundown-menu]').click()
  await page.locator('[data-rundown-delete]').click()
  await expect(page.locator('[data-rundown-delete]')).toContainText('Tap again')
  await page.locator('[data-rundown-menu]').click()
  await page.locator('[data-rundown-menu]').click()
  await expect(page.locator('[data-rundown-delete]')).toContainText('Delete')
  expect((await state()).stacks).toHaveLength(2)
})

test('the shown rundown falls back to the first when its rundown is deleted elsewhere', async ({ page }) => {
  await command({ type: 'createStack', name: 'A' })
  await command({ type: 'createStack', name: 'B' })
  await openLive(page)
  await page.locator('[data-rundown-menu]').click()
  await page.locator('[data-stack-tab=stack-2]').click()
  await expect(page.locator('[data-stack]')).toHaveAttribute('data-stack', 'stack-2')
  await command({ type: 'deleteStack', id: 'stack-2' })
  await expect(page.locator('[data-stack]')).toHaveAttribute('data-stack', 'stack-1')
  await command({ type: 'createStack', name: 'C' })
  await page.locator('[data-rundown-menu]').click()
  await expect(page.locator('[data-stack-tab]')).toHaveCount(2)
})

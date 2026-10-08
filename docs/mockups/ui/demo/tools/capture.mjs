// Re-creates the documentation screenshots from a clean state.   node docs/mockups/ui/demo/tools/capture.mjs
// Needs Chromium: CHROMIUM_PATH=/path/to/chromium (defaults to /opt/pw-browsers/chromium).
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const INDEX = pathToFileURL(path.join(here, '..', 'index.html')).href
const OUT = path.join(here, '..', 'shots')
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' })
const p = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
const click = (sel) => p.locator(sel).first().click()
const fresh = async (layout = 'a') => { await p.goto(`${INDEX}?layout=${layout}&chrome=0&fit=0&fresh=1`); await p.waitForTimeout(250) }
const shot = async (name) => { await p.waitForTimeout(120); await p.screenshot({ path: path.join(OUT, name + '.png') }); console.log('ok', name) }
const places = async (order) => { for (const [slot, place] of order) await click(`[data-act=place][data-s="${slot}"][data-p="${place}"]`) }

/* ── Layout A ── */
await fresh('a'); await shot('a-live')
await click('[data-act=layer][data-v=standings]'); await click('[data-act=upd]'); await shot('a-library-update')
await fresh('a'); await click('[data-act=saveopen]'); await p.locator('[data-in=savename]').fill('Race win — hero v2'); await click('[data-act=saveaddcue]'); await shot('a-save')
await fresh('a'); await click('[data-act=mode][data-m=edit]'); await click('[data-act=opencue][data-i="4"]'); await shot('a-edit')
await fresh('a'); await click('[data-act=mode][data-m=edit]')
{ const g = await p.locator('[data-drag="cue:1"]').first().boundingBox(), row = await p.locator('.cue.ed[data-di="6"]').boundingBox()
  await p.mouse.move(g.x + 10, g.y + 10); await p.mouse.down(); await p.mouse.move(g.x + 30, g.y + 40, { steps: 3 }); await p.mouse.move(row.x + 120, row.y + row.height - 4, { steps: 12 }); await shot('a-drag'); await p.mouse.up() }
await fresh('a'); await click('[data-act=libmenu][data-id=l2]'); await shot('a-library-manage')
await fresh('a'); await click('[data-act=out][data-o=twin]'); await p.keyboard.press('Enter'); await shot('a-twin')
await fresh('a'); await click('[data-act=emerg][data-e=hold]'); await shot('a-hold')
await fresh('a'); await p.evaluate(() => { DEMO.S.connected = false; DEMO.render() }); await shot('a-disconnected')

/* ── Race (live race + map, players, scoreboard) ── */
await fresh('a'); await click('[data-act=view][data-v=race]'); await shot('a-race-start')
await places([[1, 1], [0, 2], [3, 3], [2, 4]]); await shot('a-race-complete')
await click('[data-act=nextrace]'); await places([[1, 1], [0, 2], [3, 3], [2, 4]]); await shot('a-race-winner')
await fresh('a'); await click('[data-act=view][data-v=race]'); await p.locator('select[data-chg=mapsel]').selectOption('Thwomp Ruins'); await shot('a-race-map-changed')
await fresh('a'); await click('[data-act=view][data-v=tour]'); await click('[data-act=tpage][data-p=lib]'); await click('[data-act=tclose]'); await click('[data-act=view][data-v=race]'); await shot('a-race-freeplay')
await fresh('a'); await p.evaluate(() => { setActiveMatch('m4'); DEMO.render() }); await click('[data-act=layer][data-v=raceWin]'); await click('[data-act=layer][data-k=matchRef][data-v=previous]'); await shot('a-live-previous-match')

/* ── Tournament set-up ── */
await fresh('a'); await click('[data-act=view][data-v=tour]'); await shot('a-tour-overview')
await click('[data-act=tpage][data-p="round:0"]'); await shot('a-tour-round')
await click('[data-act=tpage][data-p="round:1"]'); await shot('a-tour-final')
await click('[data-act=tpage][data-p=graphics]'); await shot('a-tour-graphics')
await click('[data-act=tpage][data-p=lib]'); await click('[data-act=tnew]'); await p.locator('[data-in=tnewname]').fill('Winter Cup'); await shot('a-tour-library')
await click('[data-act=tnewgo]'); await shot('a-tour-new-round')
await click('[data-act=tpage][data-p=overview]'); await shot('a-tour-overview-todo')
await fresh('a'); await click('[data-act=view][data-v=setup]'); await click('[data-act=snav][data-n="Text & fonts"]'); await shot('a-setup')

/* ── Layout B ── */
await fresh('b'); await shot('b-live')
await click('[data-act=layer][data-v=title]'); await click('[data-act=store]'); await click('.slot.filled[data-si="0"] [data-act=storeto]'); await shot('b-store')
await fresh('b'); await click('[data-act=bankedit]'); await click('.slot.filled[data-si="1"] [data-act=slotmenu]'); await shot('b-bank-edit')
await fresh('b'); await click('[data-act=seqmode][data-m=edit]'); await click('.chip[data-i="4"]'); await shot('b-sequence-edit')
await fresh('b'); await click('[data-act=deck]'); await shot('b-deck')
await fresh('b'); await click('[data-act=rdmenu]'); await shot('b-rundowns')

console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors')
await browser.close()
process.exit(errs.length ? 1 : 0)

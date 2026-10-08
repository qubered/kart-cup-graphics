import puppeteer from 'puppeteer'

const argBase = process.argv.indexOf('--base')
const base = argBase > -1 ? process.argv[argBase + 1] : 'http://localhost:8080'

const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
const version = await browser.version()
if (!/^(Headless)?Chrome\/103/.test(version)) {
  console.error(`Expected Chromium 103, got ${version}`)
  await browser.close()
  process.exit(1)
}
console.log(`browser: ${version}`)

const errors: string[] = []
const pages: [string, boolean][] = [
  ['/control', false],
  ['/multiview', false],
  ['/out/wide', true],
  ['/out/twins?view=preview', true],
  ['/out/stream', true],
  ['/out/twins/left', true],
  ['/out/twins/right', true],
  ['/out/superwide', true],
]

async function open(path: string, w = 1920, h = 1080) {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h })
  page.on('pageerror', (e) => errors.push(`${path}: ${e}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${path}: ${m.text()}`) })
  await page.goto(base + path, { waitUntil: 'networkidle0' })
  return page
}

for (const [path, isOutput] of pages) {
  const page = await open(path)
  if (isOutput) await page.waitForSelector('body[data-ready]', { timeout: 10000 })
  await page.close()
}

// fps probe: wide output with background A + title taken
const ws = await import('ws')
await new Promise<void>((resolve, reject) => {
  const sock = new ws.WebSocket(base.replace(/^http/, 'ws') + '/ws')
  sock.on('open', () => {
    sock.send(JSON.stringify({ type: 'subscribe', sub: { role: 'control' } }))
    sock.send(JSON.stringify({ type: 'command', command: { type: 'setLayers', outputId: 'wide', patch: { background: 'A', scene: 'title' } } }))
    sock.send(JSON.stringify({ type: 'command', command: { type: 'take', mode: 'cut', outputIds: ['wide'] } }))
    setTimeout(() => { sock.close(); resolve() }, 500)
  })
  sock.on('error', reject)
})
const fpsPage = await open('/out/wide', 3840, 1152)
await fpsPage.waitForSelector('body[data-ready]', { timeout: 10000 })
const fps = (await fpsPage.evaluate(`new Promise((resolve) => {
  let frames = 0
  const start = performance.now()
  const tick = (t) => {
    frames++
    if (t - start >= 5000) resolve(Math.round((frames / ((t - start) / 1000)) * 10) / 10)
    else requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})`)) as number
console.log(`wide fps: ${fps}`)
await browser.close()

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`OK ${pages.length} pages, 0 errors`)

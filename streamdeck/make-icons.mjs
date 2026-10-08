// Regenerates the PNG icons in the plugin folder. Run from the repo root install: node streamdeck/make-icons.mjs
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
const sharp = createRequire(new URL('../package.json', import.meta.url))('sharp')
const out = new URL('./com.qubered.kartcup.sdPlugin/imgs/', import.meta.url).pathname
mkdirSync(out, { recursive: true })

const glyphs = {
  plugin: '<path d="M30 20h40l-6 60H36z" fill="#fff"/><circle cx="50" cy="42" r="10" fill="#e11d48"/>',
  category: '<path d="M30 20h40l-6 60H36z" fill="#fff"/>',
  recall: '<rect x="22" y="22" width="56" height="56" rx="8" fill="none" stroke="#fff" stroke-width="7"/><path d="M42 36l24 14-24 14z" fill="#fff"/>',
  step: '<path d="M22 34l22 16-22 16zM48 34l22 16-22 16z" fill="#fff"/><rect x="74" y="34" width="6" height="32" fill="#fff"/>',
  take: '<circle cx="50" cy="50" r="26" fill="#fff"/><circle cx="50" cy="50" r="12" fill="#e11d48"/>',
}
const bg = { plugin: '#be123c', category: '#be123c', recall: '#1e293b', 'recall-active': '#be123c', step: '#1e293b', take: '#1e293b' }
const svg = (name) => {
  const g = glyphs[name === 'recall-active' ? 'recall' : name]
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="14" fill="${bg[name]}"/>${g}</svg>`)
}
const sizes = { plugin: 256, category: 28, recall: 72, 'recall-active': 72, step: 72, take: 72 }
for (const name of Object.keys(bg)) {
  const s = sizes[name]
  await sharp(svg(name), { density: 300 }).resize(s, s).png().toFile(`${out}${name}.png`)
  await sharp(svg(name), { density: 300 }).resize(s * 2, s * 2).png().toFile(`${out}${name}@2x.png`)
}

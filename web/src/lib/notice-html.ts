import { fontStack } from '../../../shared/fonts'
import type { NoticeBlock, NoticeDoc, NoticeRun } from '../../../shared/types'

/** Doc -> editor HTML. Sizes are px on the 1080 canvas; the editor surface is zoomed to fit. */
export function docToHtml(doc: NoticeDoc): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
  return doc.blocks.map((b) => {
    const inner = b.runs.map((r) => {
      const css = [r.bold && 'font-weight:900', r.italic && 'font-style:italic', r.underline && 'text-decoration:underline', r.color && `color:${r.color}`,
        r.font && `font-family:${fontStack(r.font).replace(/"/g, "'")}`, r.size && `font-size:${r.size}px`].filter(Boolean).join(';')
      return `<span style="${css}">${esc(r.text)}</span>`
    }).join('')
    return `<div style="text-align:${b.align}">${inner || '<br>'}</div>`
  }).join('')
}

type Style = Omit<NoticeRun, 'text'>

const hex = (c: string): string | undefined => {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim())
  if (m) return `#${m[1].toLowerCase()}`
  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(c)
  if (rgb) return `#${[rgb[1], rgb[2], rgb[3]].map((n) => Math.min(255, +n).toString(16).padStart(2, '0')).join('')}`
  return undefined
}
const firstFamily = (f: string) => f.split(',')[0].trim().replace(/^["']|["']$/g, '')

function styleOf(el: HTMLElement, base: Style, families: Set<string>): Style {
  const s: Style = { ...base }
  const tag = el.tagName
  if (tag === 'B' || tag === 'STRONG') s.bold = true
  if (tag === 'I' || tag === 'EM') s.italic = true
  if (tag === 'U') s.underline = true
  if (tag === 'FONT') {
    const c = hex(el.getAttribute('color') ?? ''); if (c) s.color = c
    const face = el.getAttribute('face'); if (face) s.font = firstFamily(face)
  }
  const st = el.style
  if (st.fontWeight) s.bold = st.fontWeight === 'bold' || +st.fontWeight >= 600
  if (st.fontStyle) s.italic = st.fontStyle === 'italic'
  if (st.textDecoration || st.textDecorationLine) s.underline = (st.textDecoration || st.textDecorationLine).includes('underline')
  if (st.color) { const c = hex(st.color); if (c) s.color = c }
  if (st.fontFamily) s.font = firstFamily(st.fontFamily)
  if (st.fontSize.endsWith('px')) s.size = Math.round(parseFloat(st.fontSize))
  if (s.font && !families.has(s.font)) delete s.font
  return s
}

/** Editor DOM -> doc. Only known fonts survive; anything else is dropped to plain text. */
export function htmlToDoc(root: HTMLElement, families: string[]): NoticeDoc {
  const fam = new Set(families)
  const blocks: NoticeBlock[] = []
  let cur: NoticeBlock | null = null
  const push = (text: string, s: Style) => {
    if (!text) return
    if (!cur) cur = { align: 'left', runs: [] }
    const last = cur.runs[cur.runs.length - 1]
    if (last && JSON.stringify({ ...last, text: '' }) === JSON.stringify({ ...s, text: '' })) last.text += text
    else cur.runs.push({ ...s, text })
  }
  const flush = () => { if (cur) { blocks.push(cur); cur = null } }
  const BLOCK = new Set(['DIV', 'P', 'LI', 'H1', 'H2', 'H3'])
  const walk = (node: Node, s: Style, align: NoticeBlock['align']) => {
    if (node.nodeType === Node.TEXT_NODE) { if (!cur) cur = { align, runs: [] }; push((node.textContent ?? '').replace(/\u00a0/g, ' '), s); return }
    if (!(node instanceof HTMLElement)) return
    if (node.tagName === 'BR') { if (!cur) cur = { align, runs: [] }; push('\n', s); return }
    const a = (node.style.textAlign || node.getAttribute('align') || align) as NoticeBlock['align']
    const al = a === 'center' || a === 'right' ? a : a === 'left' ? 'left' : align
    const own = styleOf(node, s, fam)
    const isBlock = BLOCK.has(node.tagName)
    if (isBlock) flush()
    if (isBlock && !cur) cur = { align: al, runs: [] }
    for (const c of Array.from(node.childNodes)) walk(c, own, al)
    if (isBlock) flush()
  }
  for (const c of Array.from(root.childNodes)) walk(c, {}, 'left')
  flush()
  // A lone <br> inside an empty block is just that block's placeholder, not a text line.
  for (const b of blocks) if (b.runs.length === 1 && b.runs[0].text === '\n') b.runs = []
  for (const b of blocks) {
    const last = b.runs[b.runs.length - 1]
    if (last && last.text.endsWith('\n') && last.text.length > 1) last.text = last.text.slice(0, -1)
  }
  return { blocks: blocks.slice(0, 60) }
}

export function loadDoc(el: HTMLElement, doc: NoticeDoc): void {
  el.innerHTML = docToHtml(doc)
}

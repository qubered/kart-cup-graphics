/*
 * Icon library, tiles and silhouettes ported verbatim from docs/mockups/shared/mockup.js (ICONS / STICKER_TILE).
 * Strings are injected with {@html} inside <defs>. Colours come from tokens.css.
 */

import { LOGO_PATH } from '../logo'
import { MATTIFY_IMAGE } from '../../../../shared/mattify'

/** Symbols (own drawings, currentColor): wheel, tire, tire2, speedo, sign, shield, box, mush, star, flag, crest. */
export const ICON_SYMBOLS = `<symbol id="i-wheel" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="12"/><path fill="currentColor" d="M12 44 Q50 33 88 44 L88 56 Q64 54 58 64 L58 90 L42 90 L42 64 Q36 54 12 56 Z"/><circle cx="50" cy="52" r="11" fill="currentColor"/></symbol>
    <symbol id="i-tire" viewBox="0 0 100 100"><circle cx="50" cy="50" r="33" fill="none" stroke="currentColor" stroke-width="24"/><circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="7 5"/><circle cx="50" cy="50" r="9" fill="currentColor"/></symbol>
    <symbol id="i-tire2" viewBox="0 0 100 100"><rect x="24" y="8" width="52" height="84" rx="22" fill="none" stroke="currentColor" stroke-width="10"/><path d="M30 32h40M30 44h40M30 56h40M30 68h40" stroke="currentColor" stroke-width="5"/></symbol>
    <symbol id="i-speedo" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="6"/><path d="M50 14v10M22 30l7 6M78 30l-7 6M14 58h10M86 58H76" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M46 60 L50 24 L54 60 Z" fill="currentColor"/><circle cx="50" cy="60" r="7" fill="currentColor"/></symbol>
    <symbol id="i-sign" viewBox="0 0 100 100"><rect x="19" y="19" width="62" height="62" rx="8" transform="rotate(45 50 50)" fill="none" stroke="currentColor" stroke-width="9"/><path d="M40 72 C40 56 60 58 60 44 L60 36" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M50 38 L60 25 L70 38 Z" fill="currentColor"/></symbol>
    <symbol id="i-shield" viewBox="0 0 100 100"><path d="M50 8 L86 20 L82 62 Q76 82 50 94 Q24 82 18 62 L14 20 Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><text x="50" y="72" text-anchor="middle" font-family="Rubik,sans-serif" font-weight="900" font-style="italic" font-size="54" fill="currentColor">8</text></symbol>
    <symbol id="i-box" viewBox="0 0 100 100"><rect x="12" y="12" width="76" height="76" rx="16" fill="none" stroke="currentColor" stroke-width="8"/><text x="50" y="73" text-anchor="middle" font-family="Rubik,sans-serif" font-weight="900" font-size="58" fill="currentColor">?</text></symbol>
    <symbol id="i-mush" viewBox="0 0 100 100"><path fill="currentColor" fill-rule="evenodd" d="M8 58 C8 26 26 10 50 10 C74 10 92 26 92 58 Z M38 32 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0 M17 46 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 M69 46 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0"/><path fill="currentColor" fill-rule="evenodd" d="M30 61 H70 V80 Q70 92 50 92 Q30 92 30 80 Z M40 72 a3 6 0 1 0 6 0 a3 6 0 1 0 -6 0 M54 72 a3 6 0 1 0 6 0 a3 6 0 1 0 -6 0"/></symbol>
    <symbol id="i-star" viewBox="0 0 100 100"><path fill="currentColor" fill-rule="evenodd" d="M50 8 L61.8 35.8 L91.8 38.4 L69 58.2 L75.9 87.6 L50 72 L24.1 87.6 L31 58.2 L8.2 38.4 L38.2 35.8 Z M41 50 a3 7 0 1 0 6 0 a3 7 0 1 0 -6 0 M53 50 a3 7 0 1 0 6 0 a3 7 0 1 0 -6 0"/></symbol>
    <symbol id="i-flag" viewBox="0 0 100 100"><path d="M18 8 V94" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><rect x="22" y="12" width="64" height="44" fill="none" stroke="currentColor" stroke-width="5"/><g fill="currentColor"><rect x="22" y="12" width="16" height="14.7"/><rect x="54" y="12" width="16" height="14.7"/><rect x="38" y="26.7" width="16" height="14.7"/><rect x="70" y="26.7" width="16" height="14.7"/><rect x="22" y="41.3" width="16" height="14.7"/><rect x="54" y="41.3" width="16" height="14.7"/></g></symbol>
    <symbol id="i-logo" viewBox="0 0 150 150"><path fill="currentColor" d="${LOGO_PATH}"/></symbol>
    <symbol id="i-crest" viewBox="0 0 400 400"><path d="M200 20 L356 110 L356 290 L200 380 L44 290 L44 110 Z" fill="none" stroke="currentColor" stroke-width="22" stroke-linejoin="round"/><path d="M200 62 L320 132 L320 268 L200 338 L80 268 L80 132 Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><g transform="translate(101.3 104.9) scale(1.33)"><path d="${LOGO_PATH}" fill="currentColor"/></g><path d="M110 250 Q100 180 140 130 M290 250 Q300 180 260 130" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-dasharray="2 22"/></symbol>`

/** Kart and bike silhouettes for the sticker-wall parade (viewBox 240x150). */
export const VEHICLE_SYMBOLS = `<symbol id="kart" viewBox="0 0 240 150"><g fill="#111"><circle cx="58" cy="112" r="32"/><circle cx="192" cy="116" r="26"/><path d="M22 96 L70 74 L170 78 L222 94 L218 110 L30 114 Z"/><path d="M60 78 L74 40 L88 42 L82 80 Z"/><path d="M84 80 L96 46 Q110 38 124 48 L132 80 Z"/><circle cx="112" cy="30" r="20"/><path d="M98 18 Q118 2 138 16 L150 22 L126 24 Z"/><path d="M118 56 L150 64 L156 58 L162 76 L150 78 Z"/></g><circle cx="58" cy="112" r="11" fill="#f3f3f3"/><circle cx="192" cy="116" r="9" fill="#f3f3f3"/></symbol>
    <symbol id="bike" viewBox="0 0 240 150"><g fill="#111"><circle cx="48" cy="116" r="28"/><circle cx="192" cy="116" r="28"/><path d="M48 116 L96 78 L176 82 L192 116" stroke="#111" stroke-width="16" fill="none" stroke-linejoin="round"/><path d="M92 82 L118 44 Q134 34 148 46 L156 84 Z"/><circle cx="142" cy="28" r="19"/><path d="M128 16 Q148 2 166 16 L176 22 L152 24 Z"/><path d="M150 56 L182 66 L186 78 L160 74 Z"/></g><circle cx="48" cy="116" r="10" fill="#f3f3f3"/><circle cx="192" cy="116" r="10" fill="#f3f3f3"/></symbol>`

/** Pattern tile 1250x280: two offset rows of 120px icons (one is the logo). */
export const PATTERN_TILE = `<g id="pattern-tile"><!-- 1250×280, two offset rows, 120px icons -->
      <use href="#i-wheel" x="65" y="10" width="120" height="120"/><use href="#i-shield" x="315" y="10" width="120" height="120"/><use href="#i-sign" x="565" y="10" width="120" height="120"/>
      <use href="#i-tire2" x="815" y="10" width="120" height="120"/><use href="#i-star" x="1065" y="10" width="120" height="120"/>
      <use href="#i-speedo" x="-60" y="150" width="120" height="120"/><use href="#i-speedo" x="1190" y="150" width="120" height="120"/><use href="#i-logo" x="190" y="150" width="120" height="120"/>
      <use href="#i-mush" x="440" y="150" width="120" height="120"/><use href="#i-box" x="690" y="150" width="120" height="120"/><use href="#i-flag" x="940" y="150" width="120" height="120"/></g>`

/**
 * The pattern icons are flat #03458f on a #0553a6 background. The image is black, and black at this opacity over that
 * background lands on the icon colour (best fit over R, G, B), so it sits in the pattern like the other icons.
 */
export const MATTIFY_OPACITY = 0.145

const MUSH_USE = '<use href="#i-mush" x="440" y="150" width="120" height="120"/>'

/** The pattern tile; with Mattify on, the mushroom is replaced by the custom image (same box, drawn in its own colours). */
export function patternTile(mattify: boolean): string {
  return mattify
    ? PATTERN_TILE.replace(MUSH_USE, `<image data-mattify href="${MATTIFY_IMAGE}" x="440" y="150" width="120" height="120" preserveAspectRatio="xMidYMid meet" opacity="${MATTIFY_OPACITY}"/>`)
    : PATTERN_TILE
}

/** Pattern fill used by Background B. */
export const PATTERN_DEF = `<pattern id="pat-b" patternUnits="userSpaceOnUse" width="1250" height="280" style="color:var(--pattern-icon)"><use href="#pattern-tile"/></pattern>`

export const PATTERN_W = 1250
export const PATTERN_H = 280

/** Sticker tile 1280x1152 on a 24px grid. Rows: A stickers, B wordmark, C stickers, D wordmark offset +640, E = row A offset +320. The wordmark text is the literal WM. */
export const STICKER_TILE = `<g id="sheet-tile">
    <g id="rowA">
      <rect class="st-o" x="12" y="24" width="400" height="73" rx="8"/><text class="st-t" x="212" y="76" font-size="38" font-style="italic" text-anchor="middle" data-max="360">BULLET SPEED TRIAL</text>
      <rect class="st-f" x="12" y="121" width="400" height="73" rx="8"/><text class="st-k" x="212" y="174" font-size="46" font-style="italic" text-anchor="middle" data-max="360">TURBO OIL</text>
      <rect class="st-o" x="436" y="24" width="170" height="170" rx="10"/><text class="st-t" x="521" y="128" font-size="96" text-anchor="middle" data-max="130">08</text>
      <rect class="st-f" x="448" y="146" width="146" height="36" rx="4"/><text class="st-k" x="521" y="173" font-size="22" text-anchor="middle" data-max="130" letter-spacing="2">KART CUP</text>
      <rect class="st-o" x="630" y="24" width="320" height="170" rx="10"/><use href="#i-mush" x="648" y="62" width="92" height="92" style="color:var(--sticker-line)"/>
      <text class="st-t" x="756" y="82" font-size="28" data-max="176">MUSHROOM</text><text class="st-t" x="756" y="130" font-size="44" font-style="italic" data-max="176">PISTON</text><text class="st-t" x="756" y="170" font-size="28" data-max="176">ENGINES</text>
      <rect class="st-o" x="974" y="24" width="140" height="73" rx="8"/><use href="#i-box" x="1018" y="34" width="52" height="52" style="color:var(--sticker-line)"/>
      <rect class="st-o" x="974" y="121" width="140" height="73" rx="8"/><use href="#i-star" x="1018" y="131" width="52" height="52" style="color:var(--sticker-line)"/>
      <use href="#i-shield" x="1136" y="39" width="136" height="140" style="color:var(--sticker-line)"/>
    </g>
    <g id="rowB"><text class="st-t wordmark" x="24" y="404" font-size="190" font-style="italic" data-fitw="980">WM</text>
      <rect class="st-f" x="1048" y="248" width="210" height="180" rx="18"/><text class="st-k" x="1153" y="400" font-size="180" font-style="italic" text-anchor="middle">8</text></g>
    <g id="rowC">
      <circle class="st-o" cx="97" cy="567" r="82"/><text class="st-t" x="97" y="588" font-size="58" text-anchor="middle" data-max="130">180</text>
      <rect class="st-f" x="206" y="482" width="170" height="170" rx="10"/><path class="st-k" d="M236 522 L276 567 L236 612 L256 612 L296 567 L256 522 Z M286 522 L326 567 L286 612 L306 612 L346 567 L306 522 Z"/>
      <rect class="st-o" x="400" y="482" width="400" height="73" rx="8"/><text class="st-t" x="600" y="534" font-size="44" font-style="italic" text-anchor="middle" data-max="360">SUPER STAR</text>
      <rect class="st-o" x="400" y="579" width="400" height="73" rx="8"/><text class="st-t" x="600" y="630" font-size="38" font-style="italic" text-anchor="middle" data-max="360">POWER BATTERY</text>
      <use href="#i-sign" x="824" y="482" width="170" height="170" style="color:var(--sticker-line)"/>
      <rect class="st-o" x="1018" y="482" width="250" height="170" rx="10"/>
      <path class="st-t" d="M1083 498 L1113 540 L1097 540 L1097 600 L1069 600 L1069 540 L1053 540 Z M1173 498 L1203 540 L1187 540 L1187 600 L1159 600 L1159 540 L1143 540 Z"/>
      <text class="st-t" x="1143" y="636" font-size="22" text-anchor="middle" data-max="220" letter-spacing="2">THIS SIDE UP</text>
    </g>
    <use href="#rowB" transform="translate(640 458)"/><use href="#rowA" transform="translate(320 916)"/></g>`

export const TILE_W = 1280
export const TILE_H = 1152

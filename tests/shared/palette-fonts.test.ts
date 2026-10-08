import { describe, expect, it } from 'vitest'
import { colourHex, PLAYER_COLOURS, textOn } from '../../shared/palette'
import { BUNDLED_FONTS, fontStack, isUpright } from '../../shared/fonts'

describe('palette and fonts', () => {
  it('colours', () => {
    expect(PLAYER_COLOURS).toHaveLength(8)
    expect(colourHex('yellow')).toBe('#ffc400')
    expect(textOn('yellow')).toBe('#14213d'); expect(textOn('cyan')).toBe('#14213d'); expect(textOn('red')).toBe('#ffffff')
  })
  it('font stacks', () => {
    expect(fontStack('Mario Kart F2')).toBe('"MK F2","Lexend Zetta",sans-serif')
    expect(fontStack('Exo 2')).toBe('"Exo 2","Rubik",sans-serif')
    expect(BUNDLED_FONTS).toHaveLength(11)
    expect(isUpright('Mario Kart F2')).toBe(true); expect(isUpright('Exo 2')).toBe(false)
  })
})

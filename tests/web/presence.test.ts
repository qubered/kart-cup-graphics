import { describe, expect, it } from 'vitest'
import { light, lightTitle } from '../../web/src/control/presence'

const e = (program: number, left = 0, right = 0, preview = 0) => ({ program, preview, left, right })

describe('light', () => {
  it('is off with no entry or no program clients', () => {
    expect(light(undefined, 'twin')).toBe('off')
    expect(light(e(0), 'hd')).toBe('off')
  })
  it('is on for non-twin outputs with any client', () => {
    expect(light(e(1), 'wide')).toBe('on')
  })
  it('treats a twin as on with a full page or with both halves', () => {
    expect(light(e(1), 'twin')).toBe('on')
    expect(light(e(2, 1, 1), 'twin')).toBe('on')
  })
  it('is partial with only one twin half', () => {
    expect(light(e(1, 1, 0), 'twin')).toBe('partial')
    expect(light(e(1, 0, 1), 'twin')).toBe('partial')
    expect(light(e(2, 2, 0), 'twin')).toBe('partial')
  })
  it('titles list the halves for twins only', () => {
    expect(lightTitle('Twins', e(2, 1, 1, 3), 'twin')).toBe('Twins: 2 program (left 1, right 1), 3 preview clients')
    expect(lightTitle('Wide', e(1), 'wide')).toBe('Wide: 1 program, 0 preview clients')
  })
})

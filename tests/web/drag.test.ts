import { describe, expect, it } from 'vitest'
import { insertionIndex } from '../../web/src/control/ui/drag'

const col = [0, 1, 2, 3].map((i) => ({ left: 0, top: i * 50, width: 300, height: 50 }))
const row = [0, 1, 2].map((i) => ({ left: i * 100, top: 0, width: 100, height: 50 }))

describe('insertionIndex', () => {
  it('is 0 above the first centre and n below the last', () => {
    expect(insertionIndex(col, 10, 5)).toBe(0)
    expect(insertionIndex(col, 10, 24)).toBe(0)
    expect(insertionIndex(col, 10, 26)).toBe(1)
    expect(insertionIndex(col, 10, 500)).toBe(4)
  })
  it('works left to right', () => {
    expect(insertionIndex(row, 10, 10, true)).toBe(0)
    expect(insertionIndex(row, 160, 10, true)).toBe(2)
    expect(insertionIndex(row, 999, 10, true)).toBe(3)
  })
  it('is 0 for an empty list', () => expect(insertionIndex([], 5, 5)).toBe(0))
})

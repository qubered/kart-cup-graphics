import { describe, expect, it } from 'vitest'
import { pointsFor, standings, totals } from '../../shared/scoring'

describe('scoring', () => {
  it('pointsFor', () => {
    expect(pointsFor(1)).toBe(15); expect(pointsFor(12)).toBe(1); expect(pointsFor(0)).toBe(0); expect(pointsFor(13)).toBe(0)
  })
  it('totals with missing positions and adjustments', () => {
    const s = { races: [{ positions: [1, 4, 3, 2] }, { positions: [2, 3, 0, 1] }], adjustments: [0, 0, 5, 0] }
    expect(totals(s)).toEqual([27, 19, 15, 27]) // plan said 24 for P4 (arithmetic typo: 12+15)
  })
  it('orders by total', () => {
    const t = { races: [{ positions: [1, 2, 3, 4] }, { positions: [4, 3, 1, 2] }], adjustments: [0, 0, 0, 0] }
    expect(standings(t).map((r) => r.playerIndex)).toEqual([2, 0, 1, 3])
  })
  it('ties share position, ordered by latest race', () => {
    const tie = { races: [{ positions: [1, 2, 3, 4] }], adjustments: [0, 3, 0, 0] }
    const st = standings(tie)
    expect(st[0].position).toBe(1); expect(st[1].position).toBe(1)
    expect(st.slice(0, 2).map((r) => r.playerIndex)).toEqual([0, 1])
    expect(st[2].position).toBe(3)
  })
  it('empty and duplicate positions do not break', () => {
    expect(standings({ races: [], adjustments: [0, 0, 0, 0] }).every((r) => r.position === 1 && r.lastRacePoints === null)).toBe(true)
    const dup = standings({ races: [{ positions: [1, 1, 0, 0] }], adjustments: [0, 0, 0, 0] })
    expect(dup).toHaveLength(4)
    expect(dup[0].lastRacePoints).toBe(15)
  })
})

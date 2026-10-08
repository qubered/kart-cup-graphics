export const POINTS = [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]

export function pointsFor(position: number): number {
  if (!Number.isInteger(position) || position < 1 || position > POINTS.length) return 0
  return POINTS[position - 1]
}

export interface ScoresInput { races: { positions: number[] }[]; adjustments: number[] }

export function totals(scores: ScoresInput, players = 4): number[] {
  return Array.from({ length: players }, (_, i) =>
    scores.races.reduce((sum, r) => sum + pointsFor(r.positions[i] ?? 0), 0) + (scores.adjustments[i] ?? 0))
}

export interface StandingRow { playerIndex: number; position: number; total: number; lastRacePoints: number | null }

export function standings(scores: ScoresInput, players = 4): StandingRow[] {
  const tot = totals(scores, players)
  const last = scores.races.length ? scores.races[scores.races.length - 1] : null
  // lower rank value = better; a missing position (0) is worst
  const lastRank = (i: number) => {
    const p = last?.positions[i] ?? 0
    return p >= 1 ? p : Number.MAX_SAFE_INTEGER
  }
  const order = Array.from({ length: players }, (_, i) => i).sort(
    (a, b) => tot[b] - tot[a] || lastRank(a) - lastRank(b) || a - b,
  )
  const rows: StandingRow[] = []
  order.forEach((playerIndex, idx) => {
    const prev = rows[idx - 1]
    const position = prev && prev.total === tot[playerIndex] ? prev.position : idx + 1
    rows.push({ playerIndex, position, total: tot[playerIndex], lastRacePoints: last ? pointsFor(last.positions[playerIndex] ?? 0) : null })
  })
  return rows
}

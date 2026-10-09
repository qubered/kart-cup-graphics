// Result rows that are not saved yet. A race is saved once all four players have a place, so until then the pad
// keeps the partial entry here (it lives for the session, so leaving the page and coming back does not lose it).
// Keyed by match and race number: switching match never shows another match's half-entered race.
class Staging {
  rows = $state<Record<string, number[]>>({})
  private key(match: string, raceNo: number) { return `${match}|${raceNo}` }
  get(match: string, raceNo: number): number[] | undefined { return this.rows[this.key(match, raceNo)] }
  set(match: string, raceNo: number, row: number[]) { this.rows[this.key(match, raceNo)] = [...row] }
  drop(match: string, raceNo: number) { delete this.rows[this.key(match, raceNo)] }
  /** Race numbers of `match` that have an unsaved entry. */
  nos(match: string): number[] {
    return Object.keys(this.rows).filter((k) => k.startsWith(`${match}|`)).map((k) => Number(k.slice(match.length + 1)))
  }
}
export const staging = new Staging()

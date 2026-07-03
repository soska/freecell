import { describe, it, expect } from 'vitest'
import { dealCodes, type Card, type Suit } from './deck'
import {
  canPlaceOnColumn,
  canMoveToFoundation,
  isRun,
  isSafeAutoplay,
  maxSupermove,
} from './rules'
import {
  autoplayStep,
  bestDest,
  canMove,
  canSendToFoundation,
  finishStep,
  newGame,
  playerMove,
  runAutoplay,
} from './engine'
import type { GameState } from './types'

const card = (rank: number, suit: Suit): Card => ({ rank, suit })

// Build a GameState from partial columns (padded to 8) with optional overrides.
function mkState(cols: Card[][], overrides: Partial<GameState> = {}): GameState {
  const columns = cols.map((c) => c.slice())
  while (columns.length < 8) columns.push([])
  return {
    dealNumber: 1,
    freeCells: [null, null, null, null],
    foundations: { C: 0, D: 0, H: 0, S: 0 },
    columns,
    started: false,
    ...overrides,
  }
}

// Render dealt columns as the spec's printed grid (top row -> bottom row).
function gridFromCols(cols: string[][]): string {
  const maxLen = Math.max(...cols.map((c) => c.length))
  const rows: string[] = []
  for (let r = 0; r < maxLen; r++) {
    const row: string[] = []
    for (const col of cols) if (col[r]) row.push(col[r])
    rows.push(row.join(' '))
  }
  return rows.join('\n')
}

describe('§4 deal generation', () => {
  it('deal #1 matches the reference vector', () => {
    const expected = [
      'JD 2D 9H JC 5D 7H 7C 5H',
      'KD KC 9S 5S AD QC KH 3H',
      '2S KS 9D QD JS AS AH 3C',
      '4C 5C TS QH 4H AC 4D 7S',
      '3S TD 4S TH 8H 2C JH 7D',
      '6D 8S 8D QS 6C 3D 8C TC',
      '6S 9C 2H 6H',
    ].join('\n')
    expect(gridFromCols(dealCodes(1))).toBe(expected)
  })

  it('deal #11982 matches the reference vector', () => {
    const expected = [
      'AH AS 4H AC 2D 6S TS JS',
      '3D 3H QS QC 8S 7H AD KS',
      'KD 6H 5S 4D 9H JH 9S 3C',
      'JC 5D 5C 8C 9D TD KH 7C',
      '6C 2C TH QH 6D TC 4S 7S',
      'JD 7D 8H 9C 2H QD 4C 5H',
      'KC 8D 2S 3S',
    ].join('\n')
    expect(gridFromCols(dealCodes(11982))).toBe(expected)
  })

  it('deals 52 unique cards, first four columns 7 / last four 6', () => {
    const cols = dealCodes(42)
    expect(cols.slice(0, 4).every((c) => c.length === 7)).toBe(true)
    expect(cols.slice(4).every((c) => c.length === 6)).toBe(true)
    const all = cols.flat()
    expect(new Set(all).size).toBe(52)
  })
})

describe('§6 tableau building', () => {
  it('empty column accepts any card (not kings-only)', () => {
    expect(canPlaceOnColumn(card(5, 'H'), [])).toBe(true)
    expect(canPlaceOnColumn(card(13, 'S'), [])).toBe(true)
  })
  it('enforces descending rank AND alternating color', () => {
    const redSeven = [card(7, 'H')]
    expect(canPlaceOnColumn(card(6, 'C'), redSeven)).toBe(true) // black 6 on red 7
    expect(canPlaceOnColumn(card(6, 'D'), redSeven)).toBe(false) // red on red
    expect(canPlaceOnColumn(card(5, 'C'), redSeven)).toBe(false) // wrong rank
  })
})

describe('§5 foundations', () => {
  it('builds up in suit from ace', () => {
    const f: Record<Suit, number> = { C: 0, D: 0, H: 0, S: 0 }
    expect(canMoveToFoundation(card(1, 'H'), f)).toBe(true)
    expect(canMoveToFoundation(card(2, 'H'), f)).toBe(false)
    f.H = 1
    expect(canMoveToFoundation(card(2, 'H'), f)).toBe(true)
  })
})

describe('§8 supermove capacity', () => {
  it('matches the spec table (non-empty destination)', () => {
    expect(maxSupermove(4, 0, false)).toBe(5)
    expect(maxSupermove(3, 0, false)).toBe(4)
    expect(maxSupermove(4, 1, false)).toBe(10)
    expect(maxSupermove(4, 2, false)).toBe(20)
    expect(maxSupermove(0, 0, false)).toBe(1)
  })
  it('halves capacity when destination is an empty column', () => {
    expect(maxSupermove(4, 1, true)).toBe(5) // (1+4)*2^0
    expect(maxSupermove(4, 2, true)).toBe(10) // (1+4)*2^1
  })
})

describe('§8 run validity', () => {
  it('accepts descending alternating runs', () => {
    expect(isRun([card(9, 'H'), card(8, 'S'), card(7, 'D')])).toBe(true)
  })
  it('rejects same-color or non-descending stacks', () => {
    expect(isRun([card(9, 'H'), card(8, 'D')])).toBe(false)
    expect(isRun([card(9, 'H'), card(7, 'S')])).toBe(false)
  })
})

describe('§9 Microsoft conservative autoplay', () => {
  it('aces and twos always play', () => {
    const f: Record<Suit, number> = { C: 0, D: 0, H: 0, S: 0 }
    expect(isSafeAutoplay(card(1, 'D'), f)).toBe(true)
    expect(isSafeAutoplay(card(2, 'D'), f)).toBe(true)
  })
  it('7♦ waits for both black 6s (6♣ and 6♠)', () => {
    expect(isSafeAutoplay(card(7, 'D'), { C: 5, S: 5, D: 6, H: 6 })).toBe(false)
    expect(isSafeAutoplay(card(7, 'D'), { C: 6, S: 6, D: 6, H: 6 })).toBe(true)
    expect(isSafeAutoplay(card(7, 'D'), { C: 6, S: 5, D: 6, H: 6 })).toBe(false)
  })
})

describe('autoplay bundled into the move + fixed point', () => {
  it('an ace exposed by a move auto-plays home in the same move', () => {
    const state: GameState = {
      dealNumber: 1,
      freeCells: [null, null, null, null],
      foundations: { C: 0, D: 0, H: 0, S: 0 },
      columns: [
        [card(1, 'H'), card(5, 'C')], // AH (top), 5C (bottom, movable)
        [],
        [],
        [],
        [],
        [],
        [],
        [],
      ],
      started: false,
    }
    // Move the bottom 5C into a free cell, exposing AH underneath it.
    const res = playerMove(
      state,
      { kind: 'column', col: 0, cardIndex: 1 },
      { kind: 'free', idx: 0 },
    )
    expect(res.moved).toBe(true)
    if (!res.moved) return
    expect(res.state.foundations.H).toBe(1)
    expect(res.state.columns[0].length).toBe(0)
    expect(res.state.freeCells[0]).toEqual(card(5, 'C'))
  })
})

describe('tap-to-move: bestDest priority', () => {
  const from = (col: number, cardIndex = 0) =>
    ({ kind: 'column', col, cardIndex }) as const

  it('sends an ace home when no tableau move exists', () => {
    const s = mkState([[card(1, 'H')]])
    expect(bestDest(s, from(0))).toEqual({ kind: 'foundation', suit: 'H' })
  })

  it('prefers a tableau build over the foundation (tableau is priority 1)', () => {
    // 2♥ could bank (H already at A), but building onto 3♠ wins.
    const s = mkState([[card(2, 'H')], [card(3, 'S')]], {
      foundations: { C: 0, D: 0, H: 1, S: 0 },
    })
    expect(bestDest(s, from(0))).toEqual({ kind: 'column', col: 1 })
  })

  it('prefers a non-empty column to build on over an empty column', () => {
    // 5♥ could go to empty col1 or onto 6♠ in col2 — the build wins.
    const s = mkState([[card(5, 'H')], [], [card(6, 'S')]])
    expect(bestDest(s, from(0))).toEqual({ kind: 'column', col: 2 })
  })

  it('falls back to a free cell when no foundation/tableau move exists', () => {
    const kings = Array.from({ length: 7 }, () => [card(13, 'S')])
    const s = mkState([[card(5, 'H')], ...kings])
    expect(bestDest(s, from(0))).toEqual({ kind: 'free', idx: 0 })
  })

  it('does not shuffle a whole column into an empty column', () => {
    // Lone 5♥ with empty columns available -> free cell, not a pointless move.
    const s = mkState([[card(5, 'H')], []])
    expect(bestDest(s, from(0))).toEqual({ kind: 'free', idx: 0 })
  })

  it('does use an empty column for a partial run with no build target', () => {
    // Q♥ sits on K♣; tapping Q♥ (leaving K♣ behind) -> the empty column.
    const s = mkState([[card(13, 'C'), card(12, 'H')], []])
    expect(bestDest(s, from(0, 1))).toEqual({ kind: 'column', col: 1 })
  })

  it('canSendToFoundation flags a bankable single card (double-tap)', () => {
    const s = mkState([[card(1, 'H')], [card(2, 'H')]])
    expect(canSendToFoundation(s, from(0))).toBe(true) // A♥ -> empty H foundation
    expect(canSendToFoundation(s, from(1))).toBe(false) // 2♥ blocked, H empty
  })
})

describe('staggered cascade steps', () => {
  it('autoplayStep plays exactly one safe card per call, to the same fixed point', () => {
    const s = mkState([[card(1, 'H')], [card(1, 'S')]])
    const s1 = autoplayStep(s)!
    expect(s1.foundations.H + s1.foundations.S).toBe(1) // one ace up
    const s2 = autoplayStep(s1)!
    expect(s2.foundations.H).toBe(1)
    expect(s2.foundations.S).toBe(1)
    expect(autoplayStep(s2)).toBeNull() // fixed point reached
    expect(runAutoplay(s).foundations).toEqual(s2.foundations)
  })

  it('autoplayStep still honors the conservative rule', () => {
    // 7♦ is bankable but unsafe (black 6s not up) -> no step.
    const s = mkState([[card(7, 'D')]], {
      foundations: { C: 0, D: 6, H: 0, S: 0 },
    })
    expect(autoplayStep(s)).toBeNull()
  })

  it('finishStep is greedy: sends any foundation-eligible card', () => {
    const s = mkState([[card(7, 'D')]], {
      foundations: { C: 0, D: 6, H: 0, S: 0 },
    })
    const s1 = finishStep(s)!
    expect(s1.foundations.D).toBe(7)
    expect(finishStep(s1)).toBeNull()
  })
})

describe('§11 illegal moves leave state unchanged', () => {
  it('rejects an illegal tableau move', () => {
    const state = newGame(1)
    const before = JSON.stringify(state)
    // Deal #1 col0 bottom = 6S, col1 bottom = 9C. 6S onto 9C is illegal.
    const bottom = state.columns[0].length - 1
    const ok = canMove(
      state,
      { kind: 'column', col: 0, cardIndex: bottom },
      { kind: 'column', col: 1 },
    )
    expect(ok).toBe(false)
    const res = playerMove(
      state,
      { kind: 'column', col: 0, cardIndex: bottom },
      { kind: 'column', col: 1 },
    )
    expect(res.moved).toBe(false)
    expect(JSON.stringify(state)).toBe(before)
  })
})

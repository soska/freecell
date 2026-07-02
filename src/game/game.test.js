import { describe, it, expect } from 'vitest'
import { dealCodes } from './deck.js'
import {
  canPlaceOnColumn,
  canMoveToFoundation,
  isRun,
  isSafeAutoplay,
  maxSupermove,
} from './rules.js'
import { newGame, playerMove, canMove } from './engine.js'

// Render dealt columns as the spec's printed grid (top row -> bottom row).
function gridFromCols(cols) {
  const maxLen = Math.max(...cols.map((c) => c.length))
  const rows = []
  for (let r = 0; r < maxLen; r++) {
    const row = []
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
    expect(canPlaceOnColumn({ rank: 5, suit: 'H' }, [])).toBe(true)
    expect(canPlaceOnColumn({ rank: 13, suit: 'S' }, [])).toBe(true)
  })
  it('enforces descending rank AND alternating color', () => {
    const redSeven = [{ rank: 7, suit: 'H' }]
    expect(canPlaceOnColumn({ rank: 6, suit: 'C' }, redSeven)).toBe(true) // black 6 on red 7
    expect(canPlaceOnColumn({ rank: 6, suit: 'D' }, redSeven)).toBe(false) // red on red
    expect(canPlaceOnColumn({ rank: 5, suit: 'C' }, redSeven)).toBe(false) // wrong rank
  })
})

describe('§5 foundations', () => {
  it('builds up in suit from ace', () => {
    const f = { C: 0, D: 0, H: 0, S: 0 }
    expect(canMoveToFoundation({ rank: 1, suit: 'H' }, f)).toBe(true)
    expect(canMoveToFoundation({ rank: 2, suit: 'H' }, f)).toBe(false)
    f.H = 1
    expect(canMoveToFoundation({ rank: 2, suit: 'H' }, f)).toBe(true)
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
    expect(
      isRun([
        { rank: 9, suit: 'H' },
        { rank: 8, suit: 'S' },
        { rank: 7, suit: 'D' },
      ]),
    ).toBe(true)
  })
  it('rejects same-color or non-descending stacks', () => {
    expect(
      isRun([
        { rank: 9, suit: 'H' },
        { rank: 8, suit: 'D' },
      ]),
    ).toBe(false)
    expect(
      isRun([
        { rank: 9, suit: 'H' },
        { rank: 7, suit: 'S' },
      ]),
    ).toBe(false)
  })
})

describe('§9 Microsoft conservative autoplay', () => {
  it('aces and twos always play', () => {
    const f = { C: 0, D: 0, H: 0, S: 0 }
    expect(isSafeAutoplay({ rank: 1, suit: 'D' }, f)).toBe(true)
    expect(isSafeAutoplay({ rank: 2, suit: 'D' }, f)).toBe(true)
  })
  it('7♦ waits for both black 6s (6♣ and 6♠)', () => {
    // Both black foundations only at 5 -> not yet safe.
    expect(isSafeAutoplay({ rank: 7, suit: 'D' }, { C: 5, S: 5, D: 6, H: 6 })).toBe(
      false,
    )
    // Both black foundations at 6 -> safe.
    expect(isSafeAutoplay({ rank: 7, suit: 'D' }, { C: 6, S: 6, D: 6, H: 6 })).toBe(
      true,
    )
    // Only one black at 6 -> still not safe.
    expect(isSafeAutoplay({ rank: 7, suit: 'D' }, { C: 6, S: 5, D: 6, H: 6 })).toBe(
      false,
    )
  })
})

describe('autoplay bundled into the move + fixed point', () => {
  it('an ace exposed by a move auto-plays home in the same move', () => {
    const state = {
      dealNumber: 1,
      freeCells: [null, null, null, null],
      foundations: { C: 0, D: 0, H: 0, S: 0 },
      columns: [
        [
          { rank: 1, suit: 'H' }, // ace of hearts (top)
          { rank: 5, suit: 'C' }, // 5 of clubs (bottom, movable)
        ],
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
    // AH auto-plays home; column 0 empties; 5C stays in the free cell.
    expect(res.state.foundations.H).toBe(1)
    expect(res.state.columns[0].length).toBe(0)
    expect(res.state.freeCells[0]).toEqual({ rank: 5, suit: 'C' })
  })
})

describe('§11 illegal moves leave state unchanged', () => {
  it('rejects an illegal tableau move', () => {
    const state = newGame(1)
    const before = JSON.stringify(state)
    // Deal #1 col0 bottom = 6S, col1 bottom = 9C. 6S onto 9C is illegal.
    const ok = canMove(
      state,
      { kind: 'column', col: 0, cardIndex: state.columns[0].length - 1 },
      { kind: 'column', col: 1 },
    )
    expect(ok).toBe(false)
    const res = playerMove(
      state,
      { kind: 'column', col: 0, cardIndex: state.columns[0].length - 1 },
      { kind: 'column', col: 1 },
    )
    expect(res.moved).toBe(false)
    expect(JSON.stringify(state)).toBe(before)
  })
})

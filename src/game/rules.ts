// Pure rule functions over GameState (§5-§10). No mutation, no I/O.

import { isRed, sameColor, SUITS, type Card, type Suit } from './deck'
import type { GameState } from './types'

type Foundations = Record<Suit, number>

// The bottom (movable) card of a column, or null.
export function bottomCard(column: Card[]): Card | null {
  return column.length ? column[column.length - 1] : null
}

export function emptyColumnCount(state: GameState): number {
  return state.columns.filter((c) => c.length === 0).length
}

export function freeCellsAvailable(state: GameState): number {
  return state.freeCells.filter((c) => c === null).length
}

// Is `cards` (top -> bottom) a valid tableau run: strictly descending rank,
// alternating color, contiguous. A single card is trivially a run.
export function isRun(cards: Card[]): boolean {
  for (let i = 0; i < cards.length - 1; i++) {
    const upper = cards[i]
    const lower = cards[i + 1]
    if (lower.rank !== upper.rank - 1) return false
    if (sameColor(upper, lower)) return false
  }
  return true
}

// §5 — can this card go onto its suit's foundation right now?
export function canMoveToFoundation(card: Card, foundations: Foundations): boolean {
  return foundations[card.suit] === card.rank - 1
}

// §6 — can `card` be placed as the sole/top card onto destination column?
// Empty columns accept ANY card (not kings-only).
export function canPlaceOnColumn(card: Card, destColumn: Card[]): boolean {
  if (destColumn.length === 0) return true
  const top = bottomCard(destColumn)!
  return card.rank === top.rank - 1 && !sameColor(card, top)
}

// §8 — supermove capacity. destIsEmpty halves capacity (the destination empty
// column cannot be used as an intermediate).
export function maxSupermove(
  freeCells: number,
  emptyColumns: number,
  destIsEmpty: boolean,
): number {
  const empties = destIsEmpty ? Math.max(0, emptyColumns - 1) : emptyColumns
  return (1 + freeCells) * 2 ** empties
}

// §9 — Microsoft conservative autoplay predicate for a single card.
// Assumes the card is legally placeable on its foundation (caller checks).
export function isSafeAutoplay(card: Card, foundations: Foundations): boolean {
  const r = card.rank
  if (r <= 2) return true // Aces and Twos always
  // Both opposite-color foundations must be at rank >= r - 1.
  if (isRed(card)) {
    return foundations.C >= r - 1 && foundations.S >= r - 1
  }
  return foundations.D >= r - 1 && foundations.H >= r - 1
}

// §10 — win: all four foundations at King.
export function isWon(state: GameState): boolean {
  return SUITS.every((s) => state.foundations[s] === 13)
}

// §10 — stuck: zero legal moves remain.
export function isStuck(state: GameState): boolean {
  if (isWon(state)) return false
  return !hasAnyLegalMove(state)
}

// Does any legal, state-changing move exist?
export function hasAnyLegalMove(state: GameState): boolean {
  const { columns, freeCells, foundations } = state
  const emptyCols = emptyColumnCount(state)
  const anyFreeCellOpen = freeCells.some((c) => c === null)

  // Free-cell cards.
  for (const card of freeCells) {
    if (!card) continue
    if (canMoveToFoundation(card, foundations)) return true
    for (const col of columns) {
      if (col.length && canPlaceOnColumn(card, col)) return true
    }
  }

  // Column bottom cards.
  for (const col of columns) {
    const card = bottomCard(col)
    if (!card) continue
    if (canMoveToFoundation(card, foundations)) return true
    if (anyFreeCellOpen) return true // move bottom card to a free cell
    for (const dest of columns) {
      if (dest === col) continue
      if (dest.length && canPlaceOnColumn(card, dest)) return true
    }
  }

  // Moving a card into an empty column is progress only if the source column
  // won't just become the new empty column (a lone card shuffling between
  // empties). It counts when a free cell is occupied or some column has >=2.
  if (emptyCols > 0) {
    if (freeCells.some((c) => c !== null)) return true
    if (columns.some((c) => c.length >= 2)) return true
  }

  return false
}

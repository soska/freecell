// Game engine: builds state, applies player moves, runs autoplay to a fixed
// point. All functions are pure w.r.t. their inputs (they return new state;
// they never mutate the passed-in state).

import { dealColumns, SUITS, type Card } from './deck'
import type { Dest, GameState, MoveResult, Source } from './types'
import {
  bottomCard,
  canMoveToFoundation,
  canPlaceOnColumn,
  emptyColumnCount,
  freeCellsAvailable,
  isRun,
  isSafeAutoplay,
  maxSupermove,
} from './rules'

export function newGame(dealNumber: number): GameState {
  return {
    dealNumber,
    freeCells: [null, null, null, null],
    foundations: { C: 0, D: 0, H: 0, S: 0 },
    columns: dealColumns(dealNumber),
    started: false,
  }
}

// Structural clone of the board (history entries are these snapshots).
export function cloneState(state: GameState): GameState {
  return {
    dealNumber: state.dealNumber,
    freeCells: state.freeCells.slice(),
    foundations: { ...state.foundations },
    columns: state.columns.map((c) => c.slice()),
    started: state.started,
  }
}

// The cards a source refers to (top -> bottom), or null if the source is empty.
export function sourceCards(state: GameState, source: Source): Card[] | null {
  if (source.kind === 'free') {
    const card = state.freeCells[source.idx]
    return card ? [card] : null
  }
  const col = state.columns[source.col]
  if (!col.length || source.cardIndex >= col.length) return null
  return col.slice(source.cardIndex)
}

// Can this move be made? Returns true/false without mutating.
export function canMove(state: GameState, source: Source, dest: Dest): boolean {
  const cards = sourceCards(state, source)
  if (!cards) return false

  // Multi-card moves only make sense onto tableau columns.
  if (cards.length > 1 && dest.kind !== 'column') return false

  // The stack being moved must itself be a valid run.
  if (!isRun(cards)) return false

  const moving = cards[0] // top card of the moving stack

  if (dest.kind === 'foundation') {
    if (dest.suit !== moving.suit) return false
    return canMoveToFoundation(moving, state.foundations)
  }

  if (dest.kind === 'free') {
    if (cards.length !== 1) return false
    return state.freeCells[dest.idx] === null
  }

  // dest.kind === 'column'
  const destCol = state.columns[dest.col]
  // Can't move a stack onto itself.
  if (source.kind === 'column' && source.col === dest.col) return false
  if (!canPlaceOnColumn(moving, destCol)) return false

  // Supermove capacity check.
  const destIsEmpty = destCol.length === 0
  const free = freeCellsAvailable(state)
  const empties = emptyColumnCount(state)
  const capacity = maxSupermove(free, empties, destIsEmpty)
  return cards.length <= capacity
}

// Apply a single validated move and return the new state. Returns the same
// state reference (unchanged) if the move is illegal.
export function applyMove(state: GameState, source: Source, dest: Dest): GameState {
  if (!canMove(state, source, dest)) return state
  const next = cloneState(state)
  const cards = sourceCards(state, source)!

  // Remove from source.
  if (source.kind === 'free') {
    next.freeCells[source.idx] = null
  } else {
    next.columns[source.col] = next.columns[source.col].slice(0, source.cardIndex)
  }

  // Add to destination.
  if (dest.kind === 'foundation') {
    next.foundations[dest.suit] += 1
  } else if (dest.kind === 'free') {
    next.freeCells[dest.idx] = cards[0]
  } else {
    next.columns[dest.col] = next.columns[dest.col].concat(cards)
  }

  next.started = true
  return next
}

// §9 — run Microsoft-conservative autoplay to a fixed point (on a clone).
export function runAutoplay(state: GameState): GameState {
  let next = state
  let changed = true
  while (changed) {
    changed = false

    // Free cells.
    for (let i = 0; i < 4; i++) {
      const card = next.freeCells[i]
      if (!card) continue
      if (
        canMoveToFoundation(card, next.foundations) &&
        isSafeAutoplay(card, next.foundations)
      ) {
        next = next === state ? cloneState(state) : next
        next.freeCells[i] = null
        next.foundations[card.suit] += 1
        changed = true
      }
    }

    // Column bottoms.
    for (let c = 0; c < next.columns.length; c++) {
      const card = bottomCard(next.columns[c])
      if (!card) continue
      if (
        canMoveToFoundation(card, next.foundations) &&
        isSafeAutoplay(card, next.foundations)
      ) {
        next = next === state ? cloneState(state) : next
        next.columns[c] = next.columns[c].slice(0, -1)
        next.foundations[card.suit] += 1
        changed = true
      }
    }
  }
  return next
}

// A player move: validate, apply, then autoplay. `prev` is the pre-move
// snapshot for undo.
export function playerMove(state: GameState, source: Source, dest: Dest): MoveResult {
  if (!canMove(state, source, dest)) return { moved: false }
  const prev = cloneState(state)
  let next = applyMove(state, source, dest)
  next = runAutoplay(next)
  return { state: next, moved: true, prev }
}

// §10 auto-finish helper: greedily send every foundation-eligible card up,
// ignoring the conservative rule (user-initiated "finish"). Runs to a fixed
// point.
export function finishNow(state: GameState): GameState {
  const next = cloneState(state)
  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < 4; i++) {
      const card = next.freeCells[i]
      if (card && canMoveToFoundation(card, next.foundations)) {
        next.freeCells[i] = null
        next.foundations[card.suit] += 1
        changed = true
      }
    }
    for (let c = 0; c < next.columns.length; c++) {
      const card = bottomCard(next.columns[c])
      if (card && canMoveToFoundation(card, next.foundations)) {
        next.columns[c] = next.columns[c].slice(0, -1)
        next.foundations[card.suit] += 1
        changed = true
      }
    }
  }
  next.started = true
  return next
}

// Is every remaining card trivially sendable to foundations? Used to enable the
// "Finish" affordance: simulate finishNow and check for a win.
export function isTriviallyWinnable(state: GameState): boolean {
  const finished = finishNow(state)
  return SUITS.every((s) => finished.foundations[s] === 13)
}

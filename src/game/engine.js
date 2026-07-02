// Game engine: builds state, applies player moves, runs autoplay to a fixed
// point, manages the undo stack. All functions are pure w.r.t. their inputs
// (they return new state; they never mutate the passed-in state).

import { dealColumns, SUITS } from './deck.js'
import {
  bottomCard,
  canMoveToFoundation,
  canPlaceOnColumn,
  emptyColumnCount,
  freeCellsAvailable,
  isRun,
  isSafeAutoplay,
  maxSupermove,
} from './rules.js'

export function newGame(dealNumber) {
  return {
    dealNumber,
    freeCells: [null, null, null, null],
    foundations: { C: 0, D: 0, H: 0, S: 0 },
    columns: dealColumns(dealNumber),
    started: false,
  }
}

// Structural clone of the board (history entries are these snapshots).
export function cloneState(state) {
  return {
    dealNumber: state.dealNumber,
    freeCells: state.freeCells.slice(),
    foundations: { ...state.foundations },
    columns: state.columns.map((c) => c.slice()),
    started: state.started,
  }
}

// ---- Sources & destinations -------------------------------------------------
//
// A "source" identifies where cards come from:
//   { kind: 'column', col: i, cardIndex: j }  -> cards j..bottom of column i
//   { kind: 'free',   idx: i }                -> the card in free cell i
//
// A "dest" identifies where they go:
//   { kind: 'column',     col: i }
//   { kind: 'free',       idx: i }
//   { kind: 'foundation', suit: 'C'|'D'|'H'|'S' }

// The cards a source refers to (top -> bottom), or null if the source is empty.
export function sourceCards(state, source) {
  if (source.kind === 'free') {
    const card = state.freeCells[source.idx]
    return card ? [card] : null
  }
  const col = state.columns[source.col]
  if (!col.length || source.cardIndex >= col.length) return null
  return col.slice(source.cardIndex)
}

// Can this move be made? Returns true/false without mutating.
export function canMove(state, source, dest) {
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
  // The source column, if any, is currently occupied so it doesn't count as an
  // available empty; free cells / other empty columns provide the capacity.
  const free = freeCellsAvailable(state)
  let empties = emptyColumnCount(state)
  // If the source is a column, it isn't empty. If the dest is empty it's part
  // of `empties`; maxSupermove handles that via destIsEmpty.
  const capacity = maxSupermove(free, empties, destIsEmpty)
  return cards.length <= capacity
}

// Apply a single validated move and return the new state. Returns the same
// state reference (unchanged) if the move is illegal.
export function applyMove(state, source, dest) {
  if (!canMove(state, source, dest)) return state
  const next = cloneState(state)
  const cards = sourceCards(state, source)

  // Remove from source.
  if (source.kind === 'free') {
    next.freeCells[source.idx] = null
  } else {
    next.columns[source.col] = next.columns[source.col].slice(
      0,
      source.cardIndex,
    )
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

// §9 — run Microsoft-conservative autoplay to a fixed point (mutates a clone).
export function runAutoplay(state) {
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

// A player move: validate, apply, then autoplay. Returns
// { state, moved, prev } where `prev` is the pre-move snapshot for undo, or
// { moved: false } if the move was illegal.
export function playerMove(state, source, dest) {
  if (!canMove(state, source, dest)) return { moved: false }
  const prev = cloneState(state)
  let next = applyMove(state, source, dest)
  next = runAutoplay(next)
  return { state: next, moved: true, prev }
}

// §10 auto-finish helper: greedily send every foundation-eligible card up,
// ignoring the conservative rule (user-initiated "finish"). Runs to a fixed
// point. Safe to expose; only useful when the board is trivially winnable.
export function finishNow(state) {
  let next = cloneState(state)
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

// Is every remaining card trivially sendable to foundations? (No tableau card
// sits above a lower-ranked card of the board that still blocks it.) Used to
// enable the "Finish" affordance. Practical test: no column has an out-of-order
// pair reading top->bottom that would prevent a pure foundation drain.
export function isTriviallyWinnable(state) {
  // Every column must be a strictly *ascending* stack top->bottom would be
  // ideal, but the real condition is: repeatedly draining foundation-eligible
  // cards empties the board. Simulate finishNow and check for a win.
  const finished = finishNow(state)
  return SUITS.every((s) => finished.foundations[s] === 13)
}

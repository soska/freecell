import type { Card, Suit } from './deck'

// The full board state (§15).
export interface GameState {
  dealNumber: number
  freeCells: (Card | null)[] // length 4
  foundations: Record<Suit, number> // top rank per suit, 0 = empty
  columns: Card[][] // 8 arrays, top -> bottom
  started: boolean // has a move been made?
}

// Where a move's cards come from.
export type Source =
  | { kind: 'column'; col: number; cardIndex: number } // cards cardIndex..bottom
  | { kind: 'free'; idx: number }

// Where a move's cards go.
export type Dest =
  | { kind: 'column'; col: number }
  | { kind: 'free'; idx: number }
  | { kind: 'foundation'; suit: Suit }

// Result of attempting a player move.
export type MoveResult =
  | { moved: false }
  | { moved: true; state: GameState; prev: GameState }

export interface Stats {
  won: number
  lost: number
  currentStreak: number
  longestStreak: number
}

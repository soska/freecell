import type { PointerEvent } from 'react'
import type { Card } from '../game/deck'
import type { Source } from '../game/types'

// The run being dragged plus the pixel width to render the ghost at.
export interface DragState {
  source: Source
  cards: Card[]
  width: number
}

// Starts a pointer-drag from a card/run.
export type CardPointerDown = (
  e: PointerEvent,
  source: Source,
  cards: Card[],
) => void

// A drop-target key encodes what and where: 'col:3' | 'free:1' | 'fdn:H'.
export type DropKey = string

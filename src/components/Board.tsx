import { isRed, SUIT_SYMBOLS, SUITS } from '../game/deck'
import type { GameState } from '../game/types'
import { cx, LABEL_LG, SLOT } from '../ui'
import { Card } from './Card'
import { Column } from './Column'
import type { CardPointerDown, DragState, DropKey } from './dnd'

interface BoardProps {
  state: GameState
  drag: DragState | null
  dropKey: DropKey | null
  onColumnCardClick: (col: number, cardIndex: number) => void
  onColumnCardDoubleClick: (col: number, cardIndex: number) => void
  onFreeCellClick: (idx: number) => void
  onFreeCellDoubleClick: (idx: number) => void
  onCardPointerDown: CardPointerDown
}

export function Board({
  state,
  drag,
  dropKey,
  onColumnCardClick,
  onColumnCardDoubleClick,
  onFreeCellClick,
  onFreeCellDoubleClick,
  onCardPointerDown,
}: BoardProps) {
  return (
    <>
      <section className="grid grid-cols-8 gap-2">
        {state.freeCells.map((card, idx) => (
          <div
            key={`f${idx}`}
            data-drop={`free:${idx}`}
            onPointerDown={(e) =>
              card && onCardPointerDown(e, { kind: 'free', idx }, [card])
            }
            className={cx(
              SLOT,
              card ? 'touch-none' : 'cursor-default',
              dropKey === `free:${idx}` && 'ring-2 ring-inset ring-green-500',
              drag?.source.kind === 'free' && drag.source.idx === idx && 'opacity-40',
            )}
            onClick={() => onFreeCellClick(idx)}
            onDoubleClick={() => onFreeCellDoubleClick(idx)}
          >
            {card ? (
              <Card card={card} className={LABEL_LG} />
            ) : (
              <span className="text-sm uppercase tracking-wide text-gray-300">
                free
              </span>
            )}
          </div>
        ))}

        {SUITS.map((suit) => (
          <div
            key={suit}
            data-drop={`fdn:${suit}`}
            className={cx(
              SLOT,
              'cursor-default',
              dropKey === `fdn:${suit}` && 'ring-2 ring-inset ring-green-500',
            )}
          >
            {state.foundations[suit] > 0 ? (
              <Card card={{ rank: state.foundations[suit], suit }} className={LABEL_LG} />
            ) : (
              <span
                className={cx(LABEL_LG, isRed({ rank: 1, suit }) ? 'text-red-200' : 'text-gray-200')}
              >
                {SUIT_SYMBOLS[suit]}
              </span>
            )}
          </div>
        ))}
      </section>

      <section className="grid flex-1 grid-cols-8 gap-2">
        {state.columns.map((cards, col) => (
          <Column
            key={col}
            col={col}
            cards={cards}
            drag={drag}
            dropKey={dropKey}
            onCardClick={onColumnCardClick}
            onCardDoubleClick={onColumnCardDoubleClick}
            onCardPointerDown={onCardPointerDown}
          />
        ))}
      </section>
    </>
  )
}

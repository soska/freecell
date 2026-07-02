import { isRed, SUIT_SYMBOLS, SUITS, type Suit } from '../game/deck'
import type { GameState, Source } from '../game/types'
import { cx, LABEL_LG, SLOT } from '../ui'
import { Card } from './Card'
import { Column } from './Column'
import type { CardPointerDown, DragState, DropKey } from './dnd'

interface BoardProps {
  state: GameState
  selected: Source | null
  drag: DragState | null
  dropKey: DropKey | null
  onColumnCardClick: (col: number, cardIndex: number) => void
  onEmptyColumnClick: (col: number) => void
  onFreeCellClick: (idx: number) => void
  onFoundationClick: (suit: Suit) => void
  onSendToFoundation: (source: Source) => void
  onCardPointerDown: CardPointerDown
}

export function Board({
  state,
  selected,
  drag,
  dropKey,
  onColumnCardClick,
  onEmptyColumnClick,
  onFreeCellClick,
  onFoundationClick,
  onSendToFoundation,
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
              card && 'touch-none',
              dropKey === `free:${idx}` && 'ring-2 ring-inset ring-green-500',
              selected?.kind === 'free' &&
                selected.idx === idx &&
                'ring-2 ring-inset ring-blue-500',
              drag?.source.kind === 'free' && drag.source.idx === idx && 'opacity-40',
            )}
            onClick={() => onFreeCellClick(idx)}
            onDoubleClick={() => card && onSendToFoundation({ kind: 'free', idx })}
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
              dropKey === `fdn:${suit}` && 'ring-2 ring-inset ring-green-500',
            )}
            onClick={() => onFoundationClick(suit)}
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
            selected={selected}
            drag={drag}
            dropKey={dropKey}
            onCardClick={onColumnCardClick}
            onEmptyClick={onEmptyColumnClick}
            onSendToFoundation={onSendToFoundation}
            onCardPointerDown={onCardPointerDown}
          />
        ))}
      </section>
    </>
  )
}

import type { Card as CardModel } from '../game/deck'
import { isRun } from '../game/rules'
import type { Source } from '../game/types'
import { CARD, cx, SLOT } from '../ui'
import { Card } from './Card'
import type { CardPointerDown, DragState, DropKey } from './dnd'

interface ColumnProps {
  col: number
  cards: CardModel[]
  selected: Source | null
  drag: DragState | null
  dropKey: DropKey | null
  onCardClick: (col: number, cardIndex: number) => void
  onEmptyClick: (col: number) => void
  onSendToFoundation: (source: Source) => void
  onCardPointerDown: CardPointerDown
}

export function Column({
  col,
  cards,
  selected,
  drag,
  dropKey,
  onCardClick,
  onEmptyClick,
  onSendToFoundation,
  onCardPointerDown,
}: ColumnProps) {
  const isSelected = (r: number) =>
    selected?.kind === 'column' && selected.col === col && r >= selected.cardIndex

  const isDragging = (r: number) =>
    drag?.source.kind === 'column' &&
    drag.source.col === col &&
    r >= drag.source.cardIndex

  return (
    <div
      className={cx('rounded-lg', dropKey === `col:${col}` && 'ring-2 ring-green-500')}
      data-drop={`col:${col}`}
    >
      {cards.length === 0 ? (
        <div
          className={cx(SLOT, 'border-dashed text-gray-300')}
          onClick={() => onEmptyClick(col)}
        >
          <span className="text-sm uppercase tracking-wide">empty</span>
        </div>
      ) : (
        cards.map((card, r) => {
          const draggable = isRun(cards.slice(r))
          return (
            <div
              key={r}
              onPointerDown={(e) =>
                draggable &&
                onCardPointerDown(e, { kind: 'column', col, cardIndex: r }, cards.slice(r))
              }
              className={cx(
                CARD,
                'cursor-pointer',
                draggable && 'touch-none',
                isSelected(r)
                  ? 'bg-blue-100 ring-2 ring-inset ring-blue-500'
                  : 'bg-white',
                isDragging(r) && 'opacity-40',
              )}
              onClick={() => onCardClick(col, r)}
              onDoubleClick={() =>
                r === cards.length - 1 &&
                onSendToFoundation({ kind: 'column', col, cardIndex: r })
              }
            >
              <Card card={card} />
            </div>
          )
        })
      )}
    </div>
  )
}

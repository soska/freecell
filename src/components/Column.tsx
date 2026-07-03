import type { Card as CardModel } from '../game/deck'
import { isRun } from '../game/rules'
import { CARD, cx, SLOT } from '../ui'
import { Card } from './Card'
import type { CardPointerDown, DragState, DropKey } from './dnd'

interface ColumnProps {
  col: number
  cards: CardModel[]
  drag: DragState | null
  dropKey: DropKey | null
  onCardClick: (col: number, cardIndex: number) => void
  onCardPointerDown: CardPointerDown
}

export function Column({
  col,
  cards,
  drag,
  dropKey,
  onCardClick,
  onCardPointerDown,
}: ColumnProps) {
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
        <div className={cx(SLOT, 'cursor-default border-dashed text-gray-300')}>
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
                'cursor-pointer bg-white',
                draggable && 'touch-none',
                isDragging(r) && 'opacity-40',
              )}
              onClick={() => onCardClick(col, r)}
            >
              <Card card={card} />
            </div>
          )
        })
      )}
    </div>
  )
}

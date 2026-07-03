import { observer } from 'mobx-react-lite'
import { isRun } from '../game/rules'
import { store } from '../store'
import { CARD, cx, SLOT } from '../ui'
import { Card } from './Card'

export const Column = observer(function Column({ col }: { col: number }) {
  const cards = store.state.columns[col]
  const drag = store.drag
  const dropKey = store.dropKey

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
                store.onCardPointerDown(
                  e,
                  { kind: 'column', col, cardIndex: r },
                  cards.slice(r),
                )
              }
              className={cx(
                CARD,
                'cursor-pointer bg-white',
                draggable && 'touch-none',
                isDragging(r) && 'opacity-40',
              )}
              onClick={() => store.onColumnCardClick(col, r)}
              onDoubleClick={() => store.onColumnCardDoubleClick(col, r)}
            >
              <Card card={card} />
            </div>
          )
        })
      )}
    </div>
  )
})

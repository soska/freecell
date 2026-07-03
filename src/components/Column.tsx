import { observer } from 'mobx-react-lite'
import { isRun } from '../game/rules'
import { cn } from '../lib/cn'
import { store } from '../store'
import { Card } from './Card'
import { Slot } from './Slot'

export const Column = observer(function Column({ col }: { col: number }) {
  const cards = store.state.columns[col]
  const { drag, dropKey } = store

  const isDragging = (r: number) =>
    drag?.source.kind === 'column' &&
    drag.source.col === col &&
    r >= drag.source.cardIndex

  return (
    <div
      className={cn('rounded-lg', dropKey === `col:${col}` && 'ring-2 ring-green-500')}
      data-drop={`col:${col}`}
    >
      {cards.length === 0 ? (
        <Slot className="border-dashed">
          <span className="text-sm uppercase tracking-wide text-gray-300">empty</span>
        </Slot>
      ) : (
        cards.map((card, r) => {
          const draggable = isRun(cards.slice(r))
          return (
            <Card
              key={r}
              card={card}
              className={cn(
                'cursor-pointer overflow-hidden mt-[-110%] first:mt-0',
                draggable && 'touch-none',
                isDragging(r) && 'opacity-40',
              )}
              onPointerDown={(e) =>
                draggable &&
                store.onCardPointerDown(
                  e,
                  { kind: 'column', col, cardIndex: r },
                  cards.slice(r),
                )
              }
              onClick={() => store.onColumnCardClick(col, r)}
              onDoubleClick={() => store.onColumnCardDoubleClick(col, r)}
            />
          )
        })
      )}
    </div>
  )
})

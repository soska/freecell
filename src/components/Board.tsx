import { observer } from 'mobx-react-lite'
import { cardCode, SUITS } from '../game/deck'
import { cn } from '../lib/cn'
import { store } from '../store'
import { Card } from './Card'
import { Column } from './Column'
import { Slot } from './Slot'
import { SuitIcon } from './suits'

export const Board = observer(function Board() {
  const { state, drag, dropKey } = store

  return (
    <>
      <section className="grid grid-cols-8 gap-2">
        {state.freeCells.map((card, idx) => {
          const dragging = drag?.source.kind === 'free' && drag.source.idx === idx
          return (
            <div
              key={`f${idx}`}
              data-drop={`free:${idx}`}
              onClick={() => store.onFreeCellClick(idx)}
              onDoubleClick={() => store.onFreeCellDoubleClick(idx)}
              className={cn(
                'rounded-lg',
                dropKey === `free:${idx}` && 'ring-2 ring-green-500',
              )}
            >
              {card ? (
                <Card
                  key={cardCode(card)}
                  card={card}
                  className={cn('touch-none', dragging && 'opacity-40')}
                  onPointerDown={(e) =>
                    store.onCardPointerDown(e, { kind: 'free', idx }, [card])
                  }
                />
              ) : (
                <Slot className="cursor-default">
                </Slot>
              )}
            </div>
          )
        })}

        {SUITS.map((suit) => (
          <div
            key={suit}
            data-drop={`fdn:${suit}`}
            className={cn(
              'relative rounded-lg',
              dropKey === `fdn:${suit}` && 'ring-2 ring-green-500',
            )}
          >
            {/* Static backing card: keeps the pile visible while the top card
                is still flying in (or flying back off on undo). */}
            {state.foundations[suit] > 1 && (
              <Card
                still
                card={{ rank: state.foundations[suit] - 1, suit }}
                className="absolute inset-0"
              />
            )}
            {state.foundations[suit] > 0 ? (
              <Card
                key={`${suit}${state.foundations[suit]}`}
                card={{ rank: state.foundations[suit], suit }}
              />
            ) : (
              <Slot>
                <SuitIcon suit={suit} className="h-[35%] w-[35%] opacity-25" />
              </Slot>
            )}
          </div>
        ))}
      </section>

      <section className="grid flex-1 grid-cols-8 gap-2">
        {state.columns.map((_cards, col) => (
          <Column key={col} col={col} />
        ))}
      </section>
    </>
  )
})

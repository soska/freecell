import { observer } from 'mobx-react-lite'
import { isRed, SUITS } from '../game/deck'
import { store } from '../store'
import { cx, LABEL_LG, SLOT } from '../ui'
import { Card } from './Card'
import { Column } from './Column'
import { SuitIcon } from './suits'

export const Board = observer(function Board() {
  const { state, drag, dropKey } = store

  return (
    <>
      <section className="grid grid-cols-8 gap-2">
        {state.freeCells.map((card, idx) => (
          <div
            key={`f${idx}`}
            data-drop={`free:${idx}`}
            onPointerDown={(e) =>
              card && store.onCardPointerDown(e, { kind: 'free', idx }, [card])
            }
            className={cx(
              SLOT,
              card ? 'touch-none' : 'cursor-default',
              dropKey === `free:${idx}` && 'ring-2 ring-inset ring-green-500',
              drag?.source.kind === 'free' && drag.source.idx === idx && 'opacity-40',
            )}
            onClick={() => store.onFreeCellClick(idx)}
            onDoubleClick={() => store.onFreeCellDoubleClick(idx)}
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
              <SuitIcon
                suit={suit}
                className={cx(
                  'h-[clamp(2rem,4vw,3.5rem)] w-[clamp(2rem,4vw,3.5rem)]',
                  isRed({ rank: 1, suit }) ? 'text-red-200' : 'text-gray-200',
                )}
              />
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

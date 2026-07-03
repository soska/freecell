import { cardLabel, isRed, type Card as CardModel } from '../game/deck'
import { cx, LABEL } from '../ui'
import { SuitIcon } from './suits'

interface CardProps {
  card: CardModel
  className?: string
}

// Renders a card's rank + suit glyph, colored red or black.
export function Card({ card, className = LABEL }: CardProps) {
  return (
    <div
      className={cx(
        className,
        'flex items-center justify-center gap-[0.15em]',
        isRed(card) ? 'color-redcard' : 'color-blackcard',
      )}
    >
      {cardLabel(card)}
      <SuitIcon suit={card.suit} className="h-[0.7em] w-[0.7em]" />
    </div>
  )
}

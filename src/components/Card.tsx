import { cardLabel, cardSuitSymbol, isRed, type Card as CardModel } from '../game/deck'
import { cx, LABEL } from '../ui'

interface CardProps {
  card: CardModel
  className?: string
}

// Renders a card's rank + suit label, colored red or black.
export function Card({ card, className = LABEL }: CardProps) {
  return (
    <span className={cx(className, isRed(card) ? 'color-redcard' : 'color-blackcard')}>
      <div className="flex items-center justify-center">
        {cardLabel(card)}
        <span className="text-xs">{cardSuitSymbol(card)}</span>
      </div>
    </span>
  )
}

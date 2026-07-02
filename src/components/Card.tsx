import { cardLabel, isRed, type Card as CardModel } from '../game/deck'
import { cx, LABEL } from '../ui'

interface CardProps {
  card: CardModel
  className?: string
}

// Renders a card's rank + suit label, colored red or black.
export function Card({ card, className = LABEL }: CardProps) {
  return (
    <span className={cx(className, isRed(card) ? 'text-red-600' : 'text-gray-900')}>
      {cardLabel(card)}
    </span>
  )
}

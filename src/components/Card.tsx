import type { HTMLAttributes } from 'react'
import { cardLabel, type Card as CardModel } from '../game/deck'
import { cn } from '../lib/cn'
import { SuitIcon } from './suits'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  card: CardModel
}

const CardLabel = ({ card }: { card: CardModel }) => {
  const isRed = card.suit === 'D' || card.suit === 'H';
  return (
    <span className={cn('text-[clamp(0.8rem,1.9vw,1.6rem)] font-bold leading-none', isRed ? 'text-red-600' : 'text-gray-900')}>{cardLabel(card)}</span>
  )
}

function Corner({ card, className }: { card: CardModel; className?: string }) {
  return (
    <div className={cn('absolute flex flex-col items-center leading-none p-1', className)}>
      <CardLabel card={card} />
      <SuitIcon suit={card.suit} className="h-5 w-5" />
    </div>
  )
}

// A full playing card that owns its own shape, size, corners and center pip.
// Callers add layout, stacking and interaction through className + div props.
export function Card({ card, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'relative aspect-5/7 w-full select-none rounded-lg border-2 border-gray-700 bg-white shadow-xl shadow-black/20',
        className,
      )}
      {...props}
    >
      <Corner card={card} className="left-1 top-1" />
      <SuitIcon
        suit={card.suit}
        className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2"
      />
      <Corner card={card} className="bottom-1 right-1 rotate-180" />
    </div>
  )
}

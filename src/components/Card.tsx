import { useState } from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'
import { cardCode, cardLabel, isRed, type Card as CardModel } from '../game/deck'
import { cn } from '../lib/cn'
import { SuitIcon } from './suits'

const pipDesigns = [
  [
    '___',
    '___',
    '_u_',
    '___',
    '___',
  ],
  [
    '_u_',
    '___',
    '___',
    '___',
    '_d_',
  ],
  [
    '_u_',
    '___',
    '_u_',
    '___',
    '_d_',
  ],
  [
    'u_u',
    '___',
    '___',
    '___',
    'd_d',
  ],
  [
    'u_u',
    '___',
    '_u_',
    '___',
    'd_d',
  ],
  [
    'u_u',
    '___',
    'u_u',
    '___',
    'd_d',
  ],
  [
    'u_u',
    '_u_',
    'u_u',
    '___',
    'd_d',
  ],
  [
    'u_u',
    '_u_',
    'u_u',
    '_d_',
    'd_d',
  ],
  [
    'u_u',
    'u_u',
    '_u_',
    'd_d',
    'd_d',
  ],
  [
    'u_u',
    'u_u',
    'u_u',
    'd_d',
    'd_d',
  ],
]


const Pip = ({ card }: { card: CardModel }) => {
  // Ace: a single oversized center pip.
  if (card.rank === 1) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <SuitIcon suit={card.suit} className="h-[40%] w-[40%]" />
      </div>
    )
  }

  // Face cards: a framed center panel with a large pip, in lieu of face art.
  if (card.rank > 10) {
    return (
      <div
        className={cn(
          'absolute inset-x-[22%] inset-y-[16%] flex items-center justify-center rounded-md border-2',
          isRed(card) ? 'border-red-600/50' : 'border-gray-800/50',
        )}
      >
        <SuitIcon suit={card.suit} className="h-[45%] w-[45%]" />
      </div>
    )
  }

  const design = pipDesigns[card.rank - 1];
  if (!design) {
    return null;
  }

  const slots = design.join('').split('');

  return (
    <div className="absolute inset-6  grid grid-cols-3 grid-rows-5">
      {slots.map((slot, index) => (
        <div key={index}>
          {slot == '_' ? null :
            <SuitIcon
              suit={card.suit}
              className={cn("h-full w-full", slot == 'd' && 'rotate-180')}
            />
          }
        </div>
      ))}
    </div>
  )
}


interface CardProps extends HTMLMotionProps<'div'> {
  card: CardModel
  /** Skip layout animation — for the drag ghost and foundation backing card. */
  still?: boolean
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
//
// Each card carries a stable layoutId (its card code), so when a move
// re-renders it under a different parent (column -> foundation -> free cell)
// Motion animates it from its old position to the new one. While in flight it
// gets z-10 so it sails over the rest of the board.
export function Card({ card, still = false, className, ...props }: CardProps) {
  const [flying, setFlying] = useState(false)
  const animation = still
    ? {}
    : {
      layout: true,
      layoutId: cardCode(card),
      transition: {
        layout: { type: 'spring' as const, stiffness: 550, damping: 38 },
      },
      onLayoutAnimationStart: () => setFlying(true),
      onLayoutAnimationComplete: () => setFlying(false),
    }
  return (
    <motion.div
      {...animation}
      className={cn(
        'relative aspect-5/7 w-full select-none rounded-lg border-2 border-gray-700 bg-white shadow-xl shadow-black/20',
        flying && 'z-10',
        className,
      )}
      {...props}
    >
      <Corner card={card} className="left-1 top-1" />
      {/* <SuitIcon
        suit={card.suit}
        className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2"
      /> */}
      <Pip card={card} />
      <Corner card={card} className="bottom-1 right-1 rotate-180" />
    </motion.div>
  )
}

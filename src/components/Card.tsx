import { useState } from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'
import { cardCode, cardLabel, isRed, type Card as CardModel } from '../game/deck'
import { cn } from '../lib/cn'
import { SuitIcon } from './suits'

// Pip centers for ranks 2-10 in 0..1 coordinates of the pip field — the
// classic layouts, including the floating odd pips (the 7's at ~1/3, the
// 10's at ~1/3 and ~2/3) that a uniform grid can't express. A pip in the
// bottom half renders rotated 180°; that's derived from y, not encoded.
const L = 0.25
const C = 0.5
const R = 0.75
const PIPS: Record<number, [number, number][]> = {
  2: [[C, 0.2], [C, 0.8]],
  3: [[C, 0.2], [C, 0.5], [C, 0.8]],
  4: [[L, 0.2], [R, 0.2], [L, 0.8], [R, 0.8]],
  5: [[L, 0.2], [R, 0.2], [C, 0.5], [L, 0.8], [R, 0.8]],
  6: [[L, 0.2], [R, 0.2], [L, 0.5], [R, 0.5], [L, 0.8], [R, 0.8]],
  7: [[L, 0.2], [R, 0.2], [C, 0.35], [L, 0.5], [R, 0.5], [L, 0.8], [R, 0.8]],
  8: [[L, 0.2], [R, 0.2], [C, 0.35], [L, 0.5], [R, 0.5], [C, 0.65], [L, 0.8], [R, 0.8]],
  9: [[L, 0.2], [R, 0.2], [L, 0.4], [R, 0.4], [C, 0.5], [L, 0.6], [R, 0.6], [L, 0.8], [R, 0.8]],
  10: [[L, 0.2], [R, 0.2], [C, 0.32], [L, 0.4], [R, 0.4], [L, 0.6], [R, 0.6], [C, 0.68], [L, 0.8], [R, 0.8]],
}


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
          'absolute inset-x-[22%] inset-y-[16%] flex items-center justify-center rounded-md border-2 bg-yellow-100',
          isRed(card) ? 'border-red-600/50' : 'border-gray-800/50',
        )}
      >
        <SuitIcon suit={card.suit} className="h-[45%] w-[45%]" />
      </div>
    )
  }

  const pips = PIPS[card.rank]
  if (!pips) return null

  return (
    <div className="absolute inset-x-[14%] inset-y-[12%] bg-yellow-100">
      {pips.map(([x, y], i) => (
        <SuitIcon
          key={i}
          suit={card.suit}
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
          className={cn(
            'absolute w-[24%] -translate-x-1/2 -translate-y-1/2',
            y > 0.5 && 'rotate-180',
          )}
        />
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
    <span className={cn('font-saira-extra-condensed text-[clamp(0.8rem,1.9vw,1.6rem)] font-light leading-none', isRed ? 'text-red-600' : 'text-gray-900')}>{cardLabel(card)}</span>
  )
}

function Corner({ card, className }: { card: CardModel; className?: string }) {
  return (
    <div className={cn('absolute flex flex-col items-center leading-none p-1 gap-1', className)}>
      <CardLabel card={card} />
      <SuitIcon suit={card.suit} className="size-4" />
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

import { motion, type MotionValue } from 'motion/react'
import { CARD, cx } from '../ui'
import { Card } from './Card'
import type { DragState } from './dnd'

interface DragGhostProps {
  drag: DragState | null
  x: MotionValue<number>
  y: MotionValue<number>
}

// The floating run that follows the pointer during a drag.
export function DragGhost({ drag, x, y }: DragGhostProps) {
  if (!drag) return null
  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-50"
      style={{ x, y, width: drag.width }}
      initial={{ scale: 0.96 }}
      animate={{ scale: 1.04 }}
    >
      {drag.cards.map((card, i) => (
        <div key={i} className={cx(CARD, 'bg-white shadow-xl')}>
          <Card card={card} />
        </div>
      ))}
    </motion.div>
  )
}

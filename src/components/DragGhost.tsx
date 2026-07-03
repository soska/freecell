import { observer } from 'mobx-react-lite'
import { motion } from 'motion/react'
import { store } from '../store'
import { CARD, cx } from '../ui'
import { Card } from './Card'

// The floating run that follows the pointer during a drag.
export const DragGhost = observer(function DragGhost() {
  const drag = store.drag
  if (!drag) return null
  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-50"
      style={{ x: store.ghostX, y: store.ghostY, width: drag.width }}
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
})

import { winPercent } from '../game/stats'
import type { Stats } from '../game/types'
import { BTN } from '../ui'

interface StatsModalProps {
  stats: Stats
  onClose: () => void
}

export function StatsModal({ stats, onClose }: StatsModalProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="min-w-[260px] rounded-lg bg-white px-7 py-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-semibold">Statistics</h2>
        <ul className="mb-4">
          <li className="py-0.5">Games won: {stats.won}</li>
          <li className="py-0.5">Games lost: {stats.lost}</li>
          <li className="py-0.5">Win percentage: {winPercent(stats)}%</li>
          <li className="py-0.5">Current streak: {stats.currentStreak}</li>
          <li className="py-0.5">Longest winning streak: {stats.longestStreak}</li>
        </ul>
        <button className={BTN} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

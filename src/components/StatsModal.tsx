import { observer } from 'mobx-react-lite'
import { winPercent } from '../game/stats'
import { store } from '../store'
import { Button } from './Button'

export const StatsModal = observer(function StatsModal() {
  const { stats } = store
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40"
      onClick={() => store.setShowStats(false)}
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
        <Button onClick={() => store.setShowStats(false)}>Close</Button>
      </div>
    </div>
  )
})

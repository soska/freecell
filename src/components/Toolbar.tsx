import { BTN } from '../ui'

interface ToolbarProps {
  dealNumber: number
  canUndo: boolean
  canFinish: boolean
  onNewGame: () => void
  onSelectGame: () => void
  onRestart: () => void
  onUndo: () => void
  onFinish: () => void
  onShowStats: () => void
}

export function Toolbar({
  dealNumber,
  canUndo,
  canFinish,
  onNewGame,
  onSelectGame,
  onRestart,
  onUndo,
  onFinish,
  onShowStats,
}: ToolbarProps) {
  return (
    <header className="flex flex-wrap items-center gap-1.5">
      <button className={BTN} onClick={onNewGame}>
        New Game
      </button>
      <button className={BTN} onClick={onSelectGame}>
        Select Game #
      </button>
      <button className={BTN} onClick={onRestart}>
        Restart
      </button>
      <button className={BTN} onClick={onUndo} disabled={!canUndo}>
        Undo
      </button>
      {canFinish && (
        <button className={BTN} onClick={onFinish}>
          Finish
        </button>
      )}
      <button className={BTN} onClick={onShowStats}>
        Statistics
      </button>
      <span className="ml-auto text-[13px] text-gray-500">Deal #{dealNumber}</span>
    </header>
  )
}

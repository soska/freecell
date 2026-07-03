import { Board } from './components/Board'
import { DragGhost } from './components/DragGhost'
import { StatsModal } from './components/StatsModal'
import { Toolbar } from './components/Toolbar'
import { useFreecell } from './hooks/useFreecell'

export default function App() {
  const g = useFreecell()

  return (
    <div className="flex min-h-screen w-full flex-col gap-3 p-4">
      <Toolbar
        dealNumber={g.state.dealNumber}
        canUndo={g.canUndo}
        canFinish={g.canFinish}
        onNewGame={g.handleNewGame}
        onSelectGame={g.handleSelectGame}
        onRestart={g.handleRestart}
        onUndo={g.handleUndo}
        onFinish={g.handleFinish}
        onShowStats={() => g.setShowStats(true)}
      />

      {g.message && (
        <div className="border border-amber-300 bg-amber-100 px-2 py-1 text-[13px]">
          {g.message}
        </div>
      )}
      {g.won && (
        <div className="border border-green-400 bg-green-200 px-2.5 py-1.5 text-center font-semibold">
          You win! 🎉
        </div>
      )}
      {g.stuck && (
        <div className="border border-red-300 bg-red-100 px-2.5 py-1.5 text-center font-semibold">
          No moves left — start a New Game or Undo.
        </div>
      )}

      <Board
        state={g.state}
        drag={g.drag}
        dropKey={g.dropKey}
        onColumnCardClick={g.onColumnCardClick}
        onFreeCellClick={g.onFreeCellClick}
        onCardPointerDown={g.onCardPointerDown}
      />

      <DragGhost drag={g.drag} x={g.ghostX} y={g.ghostY} />

      {g.showStats && (
        <StatsModal stats={g.stats} onClose={() => g.setShowStats(false)} />
      )}

      <footer className="text-xs text-gray-500">
        Tap a card (or run) to send it to the best spot — foundation, then
        tableau, then a free cell. Drag for manual placement. Unlimited undo.
      </footer>
    </div>
  )
}

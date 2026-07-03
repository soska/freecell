import { observer } from 'mobx-react-lite'
import { Board } from './components/Board'
import { DragGhost } from './components/DragGhost'
import { StatsModal } from './components/StatsModal'
import { Toolbar } from './components/Toolbar'
import { store } from './store'

const App = observer(function App() {
  return (
    <div className="flex min-h-screen w-full flex-col gap-3 p-4 bg-green-700">
      <Toolbar />

      {store.message && (
        <div className="border border-amber-300 bg-amber-100 px-2 py-1 text-[13px]">
          {store.message}
        </div>
      )}
      {store.won && (
        <div className="border border-green-400 bg-green-200 px-2.5 py-1.5 text-center font-semibold">
          You win! 🎉
        </div>
      )}
      {store.stuck && (
        <div className="border border-red-300 bg-red-100 px-2.5 py-1.5 text-center font-semibold">
          No moves left — start a New Game or Undo.
        </div>
      )}

      <Board />
      <DragGhost />
      {store.showStats && <StatsModal />}

      <footer className="text-xs text-gray-500">
        Tap a card (or run) to move it to the best spot — tableau, then
        foundation, then a free cell. Double-tap sends a card to its foundation.
        Drag for manual placement. Unlimited undo.
      </footer>
    </div>
  )
})

export default App

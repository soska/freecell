import { observer } from 'mobx-react-lite'
import { store } from '../store'
import { BTN } from '../ui'

export const Toolbar = observer(function Toolbar() {
  return (
    <header className="flex flex-wrap items-center gap-1.5">
      <button className={BTN} onClick={() => store.newGame()}>
        New Game
      </button>
      <button className={BTN} onClick={() => store.selectGame()}>
        Select Game #
      </button>
      <button className={BTN} onClick={() => store.restart()}>
        Restart
      </button>
      <button className={BTN} onClick={() => store.undo()} disabled={!store.canUndo}>
        Undo
      </button>
      {store.canFinish && (
        <button className={BTN} onClick={() => store.finish()}>
          Finish
        </button>
      )}
      <button className={BTN} onClick={() => store.setShowStats(true)}>
        Statistics
      </button>
      <span className="ml-auto text-[13px] text-gray-500">
        Deal #{store.state.dealNumber}
      </span>
    </header>
  )
})

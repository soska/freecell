import { observer } from 'mobx-react-lite'
import { store } from '../store'
import { Button } from './Button'

export const Toolbar = observer(function Toolbar() {
  return (
    <header className="flex flex-wrap items-center gap-1.5">
      <Button onClick={() => store.newGame()}>New Game</Button>
      <Button onClick={() => store.selectGame()}>Select Game #</Button>
      <Button onClick={() => store.restart()}>Restart</Button>
      <Button onClick={() => store.undo()} disabled={!store.canUndo}>
        Undo
      </Button>
      {store.canFinish && <Button onClick={() => store.finish()}>Finish</Button>}
      <Button onClick={() => store.setShowStats(true)}>Statistics</Button>
      <span className="ml-auto text-[13px] text-gray-500">
        Deal #{store.state.dealNumber}
      </span>
    </header>
  )
})

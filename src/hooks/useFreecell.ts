import { useEffect, useMemo, useRef, useState } from 'react'
import { animate, useMotionValue } from 'motion/react'
import type { Card, Suit } from '../game/deck'
import {
  bestDest,
  canMove,
  finishNow,
  isTriviallyWinnable,
  newGame,
  playerMove,
} from '../game/engine'
import { isRun, isStuck, isWon } from '../game/rules'
import {
  clearGame,
  loadGame,
  loadStats,
  recordLoss,
  recordWin,
  saveGame,
  saveStats,
} from '../game/stats'
import type { Dest, GameState, Source } from '../game/types'
import type { DragState, DropKey } from '../components/dnd'

const DRAG_THRESHOLD = 5 // px before a press becomes a drag (vs a click)

function randomDeal(): number {
  return Math.floor(Math.random() * 1000000) + 1
}

interface DragRef {
  source: Source
  cards: Card[]
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  originX: number
  originY: number
  width: number
  moved: boolean
}

// Which drop-target key (if any) is under the given viewport point?
function targetKeyAt(x: number, y: number): DropKey | null {
  const el = document.elementFromPoint(x, y)
  return el?.closest<HTMLElement>('[data-drop]')?.dataset.drop ?? null
}

function parseDest(key: DropKey): Dest | null {
  const [kind, val] = key.split(':')
  if (kind === 'col') return { kind: 'column', col: Number(val) }
  if (kind === 'free') return { kind: 'free', idx: Number(val) }
  if (kind === 'fdn') return { kind: 'foundation', suit: val as Suit }
  return null
}

export function useFreecell() {
  const [state, setState] = useState<GameState>(() => loadGame() ?? newGame(randomDeal()))
  const [history, setHistory] = useState<GameState[]>([]) // pre-move snapshots
  const [stats, setStats] = useState(loadStats)
  const [message, setMessage] = useState('')
  const [resolved, setResolved] = useState(false) // win/loss already counted
  const [showStats, setShowStats] = useState(false)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [dropKey, setDropKey] = useState<DropKey | null>(null)

  const dragRef = useRef<DragRef | null>(null)
  const suppressClickRef = useRef(false) // ignore the click synthesized after a drag
  const ghostX = useMotionValue(0)
  const ghostY = useMotionValue(0)

  const won = useMemo(() => isWon(state), [state])
  const stuck = useMemo(() => !won && isStuck(state), [state, won])
  const canFinish = useMemo(() => !won && isTriviallyWinnable(state), [state, won])

  // Persist board on every change.
  useEffect(() => {
    saveGame(state)
  }, [state])

  // Settle a win exactly once.
  useEffect(() => {
    if (won && !resolved) {
      const next = recordWin(stats)
      setStats(next)
      saveStats(next)
      setResolved(true)
      setMessage('You win! 🎉')
    }
  }, [won, resolved, stats])

  function flash(msg: string) {
    setMessage(msg)
  }

  // Abandon current game as a loss if it was started, not resolved, not won.
  function settleAbandoned() {
    if (state.started && !resolved && !isWon(state)) {
      const next = recordLoss(stats)
      setStats(next)
      saveStats(next)
    }
  }

  function startGame(dealNumber: number) {
    settleAbandoned()
    setState(newGame(dealNumber))
    setHistory([])
    setResolved(false)
    setMessage('')
    clearGame()
  }

  function handleNewGame() {
    startGame(randomDeal())
  }

  function handleSelectGame() {
    const input = window.prompt('Enter a deal number (1 – 1000000):')
    if (input === null) return
    const n = Number(input)
    if (!Number.isInteger(n) || n < 1 || n > 1000000) {
      flash('Invalid deal number. Must be an integer in [1, 1000000].')
      return
    }
    startGame(n)
  }

  function handleRestart() {
    settleAbandoned()
    setState(newGame(state.dealNumber))
    setHistory([])
    setResolved(false)
    setMessage('')
  }

  function handleUndo() {
    if (won) return // never uncommit a win
    if (history.length === 0) {
      flash('Nothing to undo.')
      return
    }
    setState(history[history.length - 1])
    setHistory(history.slice(0, -1))
    setMessage('')
  }

  function handleFinish() {
    setHistory([...history, state])
    setState(finishNow(state))
  }

  // Attempt a move; update state/history.
  function tryMove(source: Source, dest: Dest) {
    const result = playerMove(state, source, dest)
    if (!result.moved) {
      flash('Illegal move.')
      return
    }
    setHistory([...history, result.prev])
    setState(result.state)
    setMessage('')
  }

  // ---- Tap-to-move: send a card/run to its best legal destination ----

  function smartMove(source: Source) {
    const dest = bestDest(state, source)
    if (dest) {
      tryMove(source, dest)
    } else {
      flash('No move available.')
    }
  }

  function onColumnCardClick(col: number, cardIndex: number) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return // click synthesized after a drag
    }
    const cards = state.columns[col].slice(cardIndex)
    if (!isRun(cards)) {
      flash('That run is blocked (must descend & alternate color).')
      return
    }
    smartMove({ kind: 'column', col, cardIndex })
  }

  function onFreeCellClick(idx: number) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (state.freeCells[idx]) smartMove({ kind: 'free', idx })
  }

  // ---- Pointer-based drag & drop (mouse + touch + pen) ----

  function onCardPointerDown(
    e: React.PointerEvent,
    source: Source,
    cards: Card[],
  ) {
    if (e.button != null && e.button !== 0) return // primary button / touch only
    suppressClickRef.current = false
    const rect = e.currentTarget.getBoundingClientRect()
    const boardState = state // frozen for this drag; the board can't change mid-drag
    dragRef.current = {
      source,
      cards,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      originX: rect.left,
      originY: rect.top,
      width: rect.width,
      moved: false,
    }

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const px = ev.clientX
      const py = ev.clientY
      if (!d.moved) {
        if (Math.hypot(px - d.startX, py - d.startY) < DRAG_THRESHOLD) return
        d.moved = true
        ghostX.set(px - d.offsetX)
        ghostY.set(py - d.offsetY)
        setDrag({ source: d.source, cards: d.cards, width: d.width })
      }
      ghostX.set(px - d.offsetX)
      ghostY.set(py - d.offsetY)
      const key = targetKeyAt(px, py)
      const dest = key ? parseDest(key) : null
      setDropKey(dest && canMove(boardState, d.source, dest) ? key : null)
      ev.preventDefault()
    }

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    const onUp = (ev: PointerEvent) => {
      const d = dragRef.current
      cleanup()
      if (!d || !d.moved) {
        dragRef.current = null
        return // treated as a click; onClick handles it
      }
      suppressClickRef.current = true
      const key = targetKeyAt(ev.clientX, ev.clientY)
      const dest = key ? parseDest(key) : null
      const done = () => {
        dragRef.current = null
        setDrag(null)
        setDropKey(null)
      }
      if (dest && canMove(boardState, d.source, dest)) {
        done()
        tryMove(d.source, dest)
      } else {
        // Spring the ghost back to its origin, then dismiss it.
        const spring = { type: 'spring', stiffness: 600, damping: 40 } as const
        Promise.all([
          animate(ghostX, d.originX, spring).finished,
          animate(ghostY, d.originY, spring).finished,
        ]).then(done, done)
      }
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  return {
    state,
    stats,
    message,
    won,
    stuck,
    canFinish,
    canUndo: !won && history.length > 0,
    drag,
    dropKey,
    ghostX,
    ghostY,
    showStats,
    setShowStats,
    handleNewGame,
    handleSelectGame,
    handleRestart,
    handleUndo,
    handleFinish,
    onColumnCardClick,
    onFreeCellClick,
    onCardPointerDown,
  }
}

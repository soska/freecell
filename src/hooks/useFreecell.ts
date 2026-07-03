import { useEffect, useMemo, useRef, useState } from 'react'
import { animate, useMotionValue } from 'motion/react'
import type { Card, Suit } from '../game/deck'
import {
  bestDest,
  canMove,
  canSendToFoundation,
  finishNow,
  isTriviallyWinnable,
  newGame,
  playerMove,
  sourceCards,
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
const TAP_DOUBLE_MS = 250 // window to wait for a double-tap on a bankable card

function randomDeal(): number {
  return Math.floor(Math.random() * 1000000) + 1
}

function sameSource(a: Source, b: Source): boolean {
  if (a.kind === 'free' && b.kind === 'free') return a.idx === b.idx
  if (a.kind === 'column' && b.kind === 'column') {
    return a.col === b.col && a.cardIndex === b.cardIndex
  }
  return false
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
  const pendingTap = useRef<{ source: Source; timer: number } | null>(null)
  const ghostX = useMotionValue(0)
  const ghostY = useMotionValue(0)

  // Always-current board, so deferred taps and drops read the latest state.
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  const won = useMemo(() => isWon(state), [state])
  const stuck = useMemo(() => !won && isStuck(state), [state, won])
  const canFinish = useMemo(() => !won && isTriviallyWinnable(state), [state, won])

  // Persist board on every change.
  useEffect(() => {
    saveGame(state)
  }, [state])

  // Cancel any pending single-tap timer on unmount.
  useEffect(() => () => clearPendingTap(), [])

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
    clearPendingTap()
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
    clearPendingTap()
    setState(newGame(state.dealNumber))
    setHistory([])
    setResolved(false)
    setMessage('')
  }

  function handleUndo() {
    if (won) return // never uncommit a win
    clearPendingTap()
    if (history.length === 0) {
      flash('Nothing to undo.')
      return
    }
    setState(history[history.length - 1])
    setHistory(history.slice(0, -1))
    setMessage('')
  }

  function handleFinish() {
    clearPendingTap()
    setHistory([...history, state])
    setState(finishNow(state))
  }

  // Attempt a move; update state/history. Reads the latest board via stateRef
  // so deferred taps and drops stay correct even if state changed meanwhile.
  function tryMove(source: Source, dest: Dest) {
    const result = playerMove(stateRef.current, source, dest)
    if (!result.moved) {
      flash('Illegal move.')
      return
    }
    setHistory((h) => [...h, result.prev])
    setState(result.state)
    setMessage('')
  }

  function smartMove(source: Source) {
    const dest = bestDest(stateRef.current, source)
    if (dest) tryMove(source, dest)
    else flash('No move available.')
  }

  function sendToFoundation(source: Source) {
    const cur = stateRef.current
    const cards = sourceCards(cur, source)
    if (!cards || cards.length !== 1) return
    const dest: Dest = { kind: 'foundation', suit: cards[0].suit }
    if (canMove(cur, source, dest)) tryMove(source, dest)
  }

  // ---- Tap to move, double-tap to bank ----
  //
  // Single tap sends a card/run to its best spot (tableau, then foundation,
  // then a free cell). Double tap always sends a single card to its foundation.
  // Because the first click of a double-click fires immediately, a *bankable*
  // card's single tap is deferred briefly so a double-tap can override it.

  function clearPendingTap() {
    if (pendingTap.current) {
      clearTimeout(pendingTap.current.timer)
      pendingTap.current = null
    }
  }

  function onCardTap(source: Source) {
    const p = pendingTap.current
    if (p && sameSource(p.source, source)) return // 2nd tap; dbl handler banks it
    if (p) {
      // Tapping a different card resolves the previous pending tap first.
      clearPendingTap()
      smartMove(p.source)
    }
    if (!canSendToFoundation(stateRef.current, source)) {
      smartMove(source) // no double-tap ambiguity for non-bankable cards / runs
      return
    }
    const timer = window.setTimeout(() => {
      pendingTap.current = null
      smartMove(source)
    }, TAP_DOUBLE_MS)
    pendingTap.current = { source, timer }
  }

  function onCardDoubleTap(source: Source) {
    clearPendingTap()
    sendToFoundation(source)
  }

  function onColumnCardClick(col: number, cardIndex: number) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return // click synthesized after a drag
    }
    const cards = stateRef.current.columns[col].slice(cardIndex)
    if (!isRun(cards)) {
      flash('That run is blocked (must descend & alternate color).')
      return
    }
    onCardTap({ kind: 'column', col, cardIndex })
  }

  function onColumnCardDoubleClick(col: number, cardIndex: number) {
    onCardDoubleTap({ kind: 'column', col, cardIndex })
  }

  function onFreeCellClick(idx: number) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (stateRef.current.freeCells[idx]) onCardTap({ kind: 'free', idx })
  }

  function onFreeCellDoubleClick(idx: number) {
    if (stateRef.current.freeCells[idx]) onCardDoubleTap({ kind: 'free', idx })
  }

  // ---- Pointer-based drag & drop (mouse + touch + pen) ----

  function onCardPointerDown(
    e: React.PointerEvent,
    source: Source,
    cards: Card[],
  ) {
    if (e.button != null && e.button !== 0) return // primary button / touch only
    clearPendingTap()
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
    onColumnCardDoubleClick,
    onFreeCellClick,
    onFreeCellDoubleClick,
    onCardPointerDown,
  }
}

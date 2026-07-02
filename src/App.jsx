import React, { useEffect, useMemo, useRef, useState } from 'react'
import { animate, motion, useMotionValue } from 'motion/react'
import { cardLabel, isRed, SUITS } from './game/deck.js'
import {
  canMove,
  finishNow,
  isTriviallyWinnable,
  newGame,
  playerMove,
  sourceCards,
} from './game/engine.js'
import { isRun, isStuck, isWon } from './game/rules.js'
import {
  clearGame,
  loadGame,
  loadStats,
  recordLoss,
  recordWin,
  saveGame,
  saveStats,
  winPercent,
} from './game/stats.js'

const SUIT_SYMBOLS = { C: '♣', D: '♦', H: '♥', S: '♠' }

// Join truthy class fragments.
const cx = (...c) => c.filter(Boolean).join(' ')

// Shared utility-class strings.
const BTN =
  'px-2.5 py-1 border border-gray-300 rounded bg-white text-sm cursor-pointer ' +
  'hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default'
const SLOT =
  'w-[52px] h-[72px] border border-gray-300 rounded-md bg-white flex ' +
  'items-center justify-center cursor-pointer select-none'

function randomDeal() {
  return Math.floor(Math.random() * 1000000) + 1
}

export default function App() {
  const [state, setState] = useState(() => loadGame() || newGame(randomDeal()))
  const [history, setHistory] = useState([]) // stack of pre-move snapshots
  const [selected, setSelected] = useState(null) // source or null
  const [stats, setStats] = useState(loadStats)
  const [message, setMessage] = useState('')
  const [resolved, setResolved] = useState(false) // win/loss already counted
  const [showStats, setShowStats] = useState(false)
  const [drag, setDrag] = useState(null) // { source, cards, width } while dragging
  const [dropKey, setDropKey] = useState(null) // key of hovered valid target

  // Pointer-drag transient data (avoids re-rendering the board on pointermove).
  const dragRef = useRef(null)
  const suppressClickRef = useRef(false) // ignore the click synthesized after a drag
  const ghostX = useMotionValue(0)
  const ghostY = useMotionValue(0)

  const won = useMemo(() => isWon(state), [state])
  const stuck = useMemo(() => !won && isStuck(state), [state, won])
  const canFinish = useMemo(
    () => !won && isTriviallyWinnable(state),
    [state, won],
  )

  // Persist board on every change.
  useEffect(() => {
    saveGame(state)
  }, [state])

  // Settle win exactly once.
  useEffect(() => {
    if (won && !resolved) {
      const next = recordWin(stats)
      setStats(next)
      saveStats(next)
      setResolved(true)
      setMessage('You win! 🎉')
    }
  }, [won, resolved, stats])

  function flash(msg) {
    setMessage(msg)
  }

  // Abandon current game as a loss if it was started, not resolved, not won.
  function settleAbandoned() {
    if (state.started && !resolved && !isWon(state)) {
      const next = recordLoss(stats)
      setStats(next)
      saveStats(next)
      return next
    }
    return stats
  }

  function startGame(dealNumber) {
    settleAbandoned()
    setState(newGame(dealNumber))
    setHistory([])
    setSelected(null)
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
    // Restarting an in-progress game counts as abandoning it.
    settleAbandoned()
    setState(newGame(state.dealNumber))
    setHistory([])
    setSelected(null)
    setResolved(false)
    setMessage('')
  }

  function handleUndo() {
    if (won) return // never uncommit a win
    if (history.length === 0) {
      flash('Nothing to undo.')
      return
    }
    const prev = history[history.length - 1]
    setHistory(history.slice(0, -1))
    setState(prev)
    setSelected(null)
    setMessage('')
  }

  function handleFinish() {
    setHistory([...history, state])
    setState(finishNow(state))
    setSelected(null)
  }

  // Attempt a move from `source` to `dest`; update state/history/selection.
  function tryMove(source, dest) {
    const result = playerMove(state, source, dest)
    if (!result.moved) {
      flash('Illegal move.')
      setSelected(null)
      return
    }
    setHistory([...history, result.prev])
    setState(result.state)
    setSelected(null)
    setMessage('')
  }

  // ---- Click handlers ----

  function onColumnCardClick(col, cardIndex) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return // this click was synthesized after a drag
    }
    if (selected) {
      // Clicking within the currently-selected source column deselects.
      if (selected.kind === 'column' && selected.col === col) {
        setSelected(null)
        return
      }
      tryMove(selected, { kind: 'column', col })
      return
    }
    // Selecting: cards from cardIndex to bottom must be a valid run.
    const cards = state.columns[col].slice(cardIndex)
    if (!isRun(cards)) {
      flash('That is not a movable run (must descend & alternate color).')
      return
    }
    setSelected({ kind: 'column', col, cardIndex })
    setMessage('')
  }

  function onEmptyColumnClick(col) {
    if (selected) {
      tryMove(selected, { kind: 'column', col })
    }
  }

  function onFreeCellClick(idx) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    const card = state.freeCells[idx]
    if (selected) {
      if (selected.kind === 'free' && selected.idx === idx) {
        setSelected(null)
        return
      }
      if (card === null) {
        tryMove(selected, { kind: 'free', idx })
      } else {
        flash('That free cell is occupied.')
        setSelected(null)
      }
      return
    }
    if (card) {
      setSelected({ kind: 'free', idx })
      setMessage('')
    }
  }

  function onFoundationClick(suit) {
    if (selected) {
      tryMove(selected, { kind: 'foundation', suit })
    }
  }

  // Double-click a movable card -> send to its foundation if legal.
  function sendToFoundation(source) {
    const cards = sourceCards(state, source)
    if (!cards || cards.length !== 1) return
    tryMove(source, { kind: 'foundation', suit: cards[0].suit })
  }

  const isSelectedCard = (col, cardIndex) =>
    selected &&
    selected.kind === 'column' &&
    selected.col === col &&
    cardIndex >= selected.cardIndex

  // ---- Pointer-based drag & drop (mouse + touch + pen) ----
  // A floating ghost follows the pointer; drop targets are hit-tested via
  // elementFromPoint against their data-drop keys. Reuses the move engine.

  const DRAG_THRESHOLD = 5 // px before a press becomes a drag (vs a click)

  // Which drop-target key (if any) is under the given viewport point?
  function targetKeyAt(x, y) {
    const el = document.elementFromPoint(x, y)
    return el?.closest('[data-drop]')?.dataset.drop || null
  }

  function parseDest(key) {
    const [kind, val] = key.split(':')
    if (kind === 'col') return { kind: 'column', col: Number(val) }
    if (kind === 'free') return { kind: 'free', idx: Number(val) }
    if (kind === 'fdn') return { kind: 'foundation', suit: val }
    return null
  }

  // Begin tracking a potential drag. `source` is the move source; `cards` are
  // the card objects to render in the ghost.
  function onCardPointerDown(e, source, cards) {
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

    const onMove = (ev) => {
      const d = dragRef.current
      if (!d) return
      const px = ev.clientX
      const py = ev.clientY
      if (!d.moved) {
        if (Math.hypot(px - d.startX, py - d.startY) < DRAG_THRESHOLD) return
        d.moved = true
        setSelected(null)
        ghostX.set(px - d.offsetX)
        ghostY.set(py - d.offsetY)
        setDrag({ source: d.source, cards: d.cards, width: d.width })
      }
      ghostX.set(px - d.offsetX)
      ghostY.set(py - d.offsetY)
      const key = targetKeyAt(px, py)
      const dest = key && parseDest(key)
      setDropKey(dest && canMove(boardState, d.source, dest) ? key : null)
      ev.preventDefault()
    }

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    const onUp = (ev) => {
      const d = dragRef.current
      cleanup()
      if (!d || !d.moved) {
        dragRef.current = null
        return // treated as a click; onClick handles it
      }
      suppressClickRef.current = true
      const key = targetKeyAt(ev.clientX, ev.clientY)
      const dest = key && parseDest(key)
      const done = () => {
        dragRef.current = null
        setDrag(null)
        setDropKey(null)
      }
      if (dest && canMove(boardState, d.source, dest)) {
        done()
        tryMove(d.source, dest)
      } else {
        // Spring the ghost back to its origin, then dismiss it. Falls back to
        // an immediate dismiss if the animation promise isn't available.
        const spring = { type: 'spring', stiffness: 600, damping: 40 }
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

  // Is this column card part of the run currently being dragged?
  const isDraggingCard = (col, cardIndex) =>
    drag &&
    drag.source.kind === 'column' &&
    drag.source.col === col &&
    cardIndex >= drag.source.cardIndex

  const isDraggingFree = (idx) =>
    drag && drag.source.kind === 'free' && drag.source.idx === idx

  return (
    <div className="mx-auto max-w-[900px] p-3">
      <header className="mb-2 flex flex-wrap items-center gap-1.5">
        <button className={BTN} onClick={handleNewGame}>
          New Game
        </button>
        <button className={BTN} onClick={handleSelectGame}>
          Select Game #
        </button>
        <button className={BTN} onClick={handleRestart}>
          Restart
        </button>
        <button
          className={BTN}
          onClick={handleUndo}
          disabled={won || history.length === 0}
        >
          Undo
        </button>
        {canFinish && (
          <button className={BTN} onClick={handleFinish}>
            Finish
          </button>
        )}
        <button className={BTN} onClick={() => setShowStats(true)}>
          Statistics
        </button>
        <span className="ml-auto text-[13px] text-gray-500">
          Deal #{state.dealNumber}
        </span>
      </header>

      {message && (
        <div className="mb-1.5 border border-amber-300 bg-amber-100 px-2 py-1 text-[13px]">
          {message}
        </div>
      )}
      {won && (
        <div className="mb-1.5 border border-green-400 bg-green-200 px-2.5 py-1.5 text-center font-semibold">
          You win! 🎉
        </div>
      )}
      {stuck && (
        <div className="mb-1.5 border border-red-300 bg-red-100 px-2.5 py-1.5 text-center font-semibold">
          No moves left — start a New Game or Undo.
        </div>
      )}

      <section className="mb-4 flex justify-between gap-4">
        <div className="flex gap-1.5">
          {state.freeCells.map((card, idx) => (
            <div
              key={idx}
              data-drop={'free:' + idx}
              onPointerDown={(e) =>
                card && onCardPointerDown(e, { kind: 'free', idx }, [card])
              }
              className={cx(
                SLOT,
                card && 'touch-none',
                dropKey === 'free:' + idx && 'ring-2 ring-inset ring-green-500',
                selected &&
                  selected.kind === 'free' &&
                  selected.idx === idx &&
                  'ring-2 ring-inset ring-blue-500',
                isDraggingFree(idx) && 'opacity-40',
              )}
              onClick={() => onFreeCellClick(idx)}
              onDoubleClick={() =>
                card && sendToFoundation({ kind: 'free', idx })
              }
            >
              {card ? (
                <Card card={card} />
              ) : (
                <span className="text-xs text-gray-400">free</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-1.5">
          {SUITS.map((suit) => (
            <div
              key={suit}
              data-drop={'fdn:' + suit}
              className={cx(
                SLOT,
                dropKey === 'fdn:' + suit && 'ring-2 ring-inset ring-green-500',
              )}
              onClick={() => onFoundationClick(suit)}
            >
              {state.foundations[suit] > 0 ? (
                <Card card={{ rank: state.foundations[suit], suit }} />
              ) : (
                <span
                  className={cx(
                    'text-xl',
                    isRed({ suit }) ? 'text-red-300' : 'text-gray-300',
                  )}
                >
                  {SUIT_SYMBOLS[suit]}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-8 gap-2">
        {state.columns.map((col, c) => (
          <div
            className={cx(
              'min-h-[80px] rounded-md',
              dropKey === 'col:' + c && 'ring-2 ring-green-500',
            )}
            key={c}
            data-drop={'col:' + c}
          >
            {col.length === 0 ? (
              <div
                className={cx(
                  'flex h-[72px] w-full cursor-pointer select-none items-center',
                  'justify-center rounded-md border border-gray-300 bg-white',
                )}
                onClick={() => onEmptyColumnClick(c)}
              >
                <span className="text-xs text-gray-400">empty</span>
              </div>
            ) : (
              col.map((card, r) => (
                <div
                  key={r}
                  onPointerDown={(e) =>
                    isRun(col.slice(r)) &&
                    onCardPointerDown(
                      e,
                      { kind: 'column', col: c, cardIndex: r },
                      col.slice(r),
                    )
                  }
                  className={cx(
                    '-mb-0.5 cursor-pointer select-none rounded-md border',
                    'border-gray-300 px-1.5 py-1',
                    isRun(col.slice(r)) && 'touch-none',
                    isSelectedCard(c, r)
                      ? 'bg-blue-100 ring-2 ring-inset ring-blue-500'
                      : 'bg-white',
                    isDraggingCard(c, r) && 'opacity-40',
                  )}
                  onClick={() => onColumnCardClick(c, r)}
                  onDoubleClick={() =>
                    r === col.length - 1 &&
                    sendToFoundation({ kind: 'column', col: c, cardIndex: r })
                  }
                >
                  <Card card={card} />
                </div>
              ))
            )}
          </div>
        ))}
      </section>

      {drag && (
        <motion.div
          className="pointer-events-none fixed left-0 top-0 z-50"
          style={{ x: ghostX, y: ghostY, width: drag.width }}
          initial={{ scale: 0.96 }}
          animate={{ scale: 1.04 }}
        >
          {drag.cards.map((card, i) => (
            <div
              key={i}
              className="-mb-0.5 rounded-md border border-gray-300 bg-white px-1.5 py-1 shadow-lg"
            >
              <Card card={card} />
            </div>
          ))}
        </motion.div>
      )}

      {showStats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}

      <footer className="mt-4 text-xs text-gray-500">
        Click a card (or a run) to pick it up, then click a destination.
        Double-click sends a card to its foundation. Unlimited undo.
      </footer>
    </div>
  )
}

function Card({ card }) {
  return (
    <span
      className={cx(
        'text-base font-semibold',
        isRed(card) ? 'text-red-700' : 'text-gray-900',
      )}
    >
      {cardLabel(card)}
    </span>
  )
}

function StatsModal({ stats, onClose }) {
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
          <li className="py-0.5">
            Longest winning streak: {stats.longestStreak}
          </li>
        </ul>
        <button className={BTN} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

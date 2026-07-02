import React, { useEffect, useMemo, useState } from 'react'
import { cardLabel, isRed, SUITS } from './game/deck.js'
import {
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

  return (
    <div className="app">
      <header className="toolbar">
        <button onClick={handleNewGame}>New Game</button>
        <button onClick={handleSelectGame}>Select Game #</button>
        <button onClick={handleRestart}>Restart</button>
        <button onClick={handleUndo} disabled={won || history.length === 0}>
          Undo
        </button>
        {canFinish && <button onClick={handleFinish}>Finish</button>}
        <button onClick={() => setShowStats(true)}>Statistics</button>
        <span className="deal-number">Deal #{state.dealNumber}</span>
      </header>

      {message && <div className="message">{message}</div>}
      {won && <div className="banner win">You win! 🎉</div>}
      {stuck && (
        <div className="banner stuck">
          No moves left — start a New Game or Undo.
        </div>
      )}

      <section className="top-row">
        <div className="free-cells">
          {state.freeCells.map((card, idx) => (
            <div
              key={idx}
              className={
                'slot' +
                (card ? ' filled' : '') +
                (selected && selected.kind === 'free' && selected.idx === idx
                  ? ' selected'
                  : '')
              }
              onClick={() => onFreeCellClick(idx)}
              onDoubleClick={() =>
                card && sendToFoundation({ kind: 'free', idx })
              }
            >
              {card ? <Card card={card} /> : <span className="empty">free</span>}
            </div>
          ))}
        </div>

        <div className="foundations">
          {SUITS.map((suit) => (
            <div
              key={suit}
              className={'slot foundation ' + (isRed({ suit }) ? 'red' : 'black')}
              onClick={() => onFoundationClick(suit)}
            >
              {state.foundations[suit] > 0 ? (
                <Card card={{ rank: state.foundations[suit], suit }} />
              ) : (
                <span className="empty">{SUIT_SYMBOLS[suit]}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="tableau">
        {state.columns.map((col, c) => (
          <div className="column" key={c}>
            {col.length === 0 ? (
              <div className="slot empty-col" onClick={() => onEmptyColumnClick(c)}>
                <span className="empty">empty</span>
              </div>
            ) : (
              col.map((card, r) => (
                <div
                  key={r}
                  className={
                    'card-in-col' + (isSelectedCard(c, r) ? ' selected' : '')
                  }
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

      {showStats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}

      <footer className="help">
        Click a card (or a run) to pick it up, then click a destination.
        Double-click sends a card to its foundation. Unlimited undo.
      </footer>
    </div>
  )
}

function Card({ card }) {
  return (
    <span className={'card ' + (isRed(card) ? 'red' : 'black')}>
      {cardLabel(card)}
    </span>
  )
}

function StatsModal({ stats, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Statistics</h2>
        <ul>
          <li>Games won: {stats.won}</li>
          <li>Games lost: {stats.lost}</li>
          <li>Win percentage: {winPercent(stats)}%</li>
          <li>Current streak: {stats.currentStreak}</li>
          <li>Longest winning streak: {stats.longestStreak}</li>
        </ul>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

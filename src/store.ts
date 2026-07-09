import type { PointerEvent as ReactPointerEvent } from 'react'
import { makeAutoObservable, observable, reaction, runInAction } from 'mobx'
import { animate, motionValue, type MotionValue } from 'motion/react'
import type { Card, Suit } from './game/deck'
import {
  applyMove,
  autoplayStep,
  bestDest,
  canMove,
  canSendToFoundation,
  finishStep,
  isTriviallyWinnable,
  newGame as dealBoard,
  runAutoplay,
  sourceCards,
} from './game/engine'
import { isRun, isStuck, isWon } from './game/rules'
import {
  loadGame,
  loadStats,
  recordLoss,
  recordWin,
  saveGame,
  saveStats,
} from './game/stats'
import type { Dest, GameState, Source, Stats } from './game/types'
import type { DragState, DropKey } from './components/dnd'

const DRAG_THRESHOLD = 5 // px before a press becomes a drag (vs a click)
const TAP_DOUBLE_MS = 160 // window to wait for a double-tap on a bankable card
const CASCADE_MS = 30 // delay between staggered autoplay/finish cards

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

// A thin observable wrapper around the pure game engine. The board itself is an
// immutable GameState held in an observable.ref; every action recomputes a new
// state via the engine, so the engine stays pure and testable and undo remains
// a plain snapshot stack.
export class GameStore {
  state: GameState
  history: GameState[] = [] // pre-move snapshots, newest last
  stats: Stats
  message = ''
  resolved = false // win/loss already counted
  showStats = false
  drag: DragState | null = null
  dropKey: DropKey | null = null
  cascading = false // an autoplay/finish cascade is stepping

  // Imperative, non-reactive fields (excluded from observability below).
  ghostX: MotionValue<number> = motionValue(0)
  ghostY: MotionValue<number> = motionValue(0)
  dragRef: DragRef | null = null
  suppressClick = false // ignore the click synthesized after a drag
  pendingTap: { source: Source; timer: number } | null = null
  cascadeTimer: number | null = null

  constructor() {
    // Restore the autoplay fixed-point invariant in case a reload interrupted
    // a staggered cascade (a no-op for any settled saved state).
    const loaded = loadGame()
    this.state = loaded ? runAutoplay(loaded) : dealBoard(randomDeal())
    this.stats = loadStats()
    makeAutoObservable(
      this,
      {
        state: observable.ref,
        history: observable.ref,
        stats: observable.ref,
        drag: observable.ref,
        ghostX: false,
        ghostY: false,
        dragRef: false,
        suppressClick: false,
        pendingTap: false,
        cascadeTimer: false,
      },
      { autoBind: true },
    )
    // Persist the current board, and settle a win exactly once.
    reaction(() => this.state, saveGame)
    reaction(() => this.won, () => this.settleWin())
  }

  // ---- Computed ----

  get won(): boolean {
    return isWon(this.state)
  }
  get stuck(): boolean {
    return !this.won && isStuck(this.state)
  }
  get canFinish(): boolean {
    return !this.won && !this.cascading && isTriviallyWinnable(this.state)
  }
  get canUndo(): boolean {
    return !this.won && this.history.length > 0
  }

  // ---- Game commands ----

  newGame(): void {
    this.begin(randomDeal())
  }

  selectGame(): void {
    const input = window.prompt('Enter a deal number (1 – 1000000):')
    if (input === null) return
    const n = Number(input)
    if (!Number.isInteger(n) || n < 1 || n > 1000000) {
      this.message = 'Invalid deal number. Must be an integer in [1, 1000000].'
      return
    }
    this.begin(n)
  }

  restart(): void {
    this.begin(this.state.dealNumber)
  }

  undo(): void {
    if (this.won) return // never uncommit a win
    this.clearPendingTap()
    // Cancelling a mid-flight cascade and popping the pre-move snapshot
    // reverts the player move plus its whole autoplay bundle in one go.
    this.cancelCascade()
    if (this.history.length === 0) {
      this.message = 'Nothing to undo.'
      return
    }
    this.state = this.history[this.history.length - 1]
    this.history = this.history.slice(0, -1)
    this.message = ''
  }

  finish(): void {
    if (this.cascading || this.won) return
    this.clearPendingTap()
    this.history = [...this.history, this.state]
    this.state = { ...this.state, started: true }
    this.startCascade(finishStep)
  }

  setShowStats(open: boolean): void {
    this.showStats = open
  }

  private begin(dealNumber: number): void {
    this.settleAbandoned()
    this.clearPendingTap()
    this.cancelCascade()
    this.state = dealBoard(dealNumber)
    this.history = []
    this.resolved = false
    this.message = ''
  }

  private settleAbandoned(): void {
    if (this.state.started && !this.resolved && !isWon(this.state)) {
      this.stats = recordLoss(this.stats)
      saveStats(this.stats)
    }
  }

  private settleWin(): void {
    if (this.won && !this.resolved) {
      this.stats = recordWin(this.stats)
      saveStats(this.stats)
      this.resolved = true
      this.message = 'You win! 🎉'
    }
  }

  // ---- Moves ----

  // Apply a player move, then stagger its autoplay cascade one card at a time.
  // A single history snapshot covers the move plus the whole cascade, so one
  // undo reverts the bundle (§12). A move made mid-cascade simply computes
  // from the intermediate state (every step is a legal position) and its own
  // cascade picks up whatever was still pending.
  private commit(source: Source, dest: Dest): void {
    if (!canMove(this.state, source, dest)) {
      this.message = 'Illegal move.'
      return
    }
    this.cancelCascade()
    this.history = [...this.history, this.state]
    this.state = applyMove(this.state, source, dest)
    this.message = ''
    this.startCascade(autoplayStep)
  }

  // Step `step` against the live state every CASCADE_MS until it returns null.
  private startCascade(step: (s: GameState) => GameState | null): void {
    const tick = () => {
      const next = step(this.state)
      runInAction(() => {
        if (next) {
          this.state = next
          this.cascadeTimer = window.setTimeout(tick, CASCADE_MS)
        } else {
          this.cascading = false
          this.cascadeTimer = null
        }
      })
    }
    if (step(this.state) === null) return // nothing pending
    this.cascading = true
    this.cascadeTimer = window.setTimeout(tick, CASCADE_MS)
  }

  private cancelCascade(): void {
    if (this.cascadeTimer !== null) {
      clearTimeout(this.cascadeTimer)
      this.cascadeTimer = null
    }
    this.cascading = false
  }

  private smartMove(source: Source): void {
    const dest = bestDest(this.state, source)
    if (dest) this.commit(source, dest)
    else this.message = 'No move available.'
  }

  private bank(source: Source): void {
    const cards = sourceCards(this.state, source)
    if (!cards || cards.length !== 1) return
    const dest: Dest = { kind: 'foundation', suit: cards[0].suit }
    if (canMove(this.state, source, dest)) this.commit(source, dest)
  }

  // ---- Tap to move, double-tap to bank ----

  onColumnCardClick(col: number, cardIndex: number): void {
    if (this.consumeSuppressedClick()) return
    const cards = this.state.columns[col].slice(cardIndex)
    if (!isRun(cards)) {
      this.message = 'That run is blocked (must descend & alternate color).'
      return
    }
    this.tap({ kind: 'column', col, cardIndex })
  }

  onColumnCardDoubleClick(col: number, cardIndex: number): void {
    this.doubleTap({ kind: 'column', col, cardIndex })
  }

  onFreeCellClick(idx: number): void {
    if (this.consumeSuppressedClick()) return
    if (this.state.freeCells[idx]) this.tap({ kind: 'free', idx })
  }

  onFreeCellDoubleClick(idx: number): void {
    if (this.state.freeCells[idx]) this.doubleTap({ kind: 'free', idx })
  }

  private consumeSuppressedClick(): boolean {
    if (this.suppressClick) {
      this.suppressClick = false
      return true
    }
    return false
  }

  // Single tap: smart-move, but defer a *bankable* card briefly so a double-tap
  // can override it with "send to foundation".
  private tap(source: Source): void {
    const p = this.pendingTap
    if (p && sameSource(p.source, source)) return // 2nd tap; dbl handler banks it
    if (p) {
      this.clearPendingTap()
      this.smartMove(p.source) // a tap on a different card resolves the pending one
    }
    if (!canSendToFoundation(this.state, source)) {
      this.smartMove(source) // no double-tap ambiguity for non-bankable cards / runs
      return
    }
    const timer = window.setTimeout(
      () => runInAction(() => {
        this.pendingTap = null
        this.smartMove(source)
      }),
      TAP_DOUBLE_MS,
    )
    this.pendingTap = { source, timer }
  }

  private doubleTap(source: Source): void {
    this.clearPendingTap()
    this.bank(source)
  }

  private clearPendingTap(): void {
    if (this.pendingTap) {
      clearTimeout(this.pendingTap.timer)
      this.pendingTap = null
    }
  }

  // ---- Pointer-based drag & drop (mouse + touch + pen) ----

  onCardPointerDown(e: ReactPointerEvent, source: Source, cards: Card[]): void {
    if (e.button != null && e.button !== 0) return // primary button / touch only
    this.clearPendingTap()
    this.suppressClick = false
    const rect = e.currentTarget.getBoundingClientRect()
    this.dragRef = {
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
      const d = this.dragRef
      if (!d) return
      const px = ev.clientX
      const py = ev.clientY
      if (!d.moved) {
        if (Math.hypot(px - d.startX, py - d.startY) < DRAG_THRESHOLD) return
        d.moved = true
        this.ghostX.set(px - d.offsetX)
        this.ghostY.set(py - d.offsetY)
        this.beginDrag({ source: d.source, cards: d.cards, width: d.width })
      }
      this.ghostX.set(px - d.offsetX)
      this.ghostY.set(py - d.offsetY)
      const key = targetKeyAt(px, py)
      const dest = key ? parseDest(key) : null
      this.setDropKey(dest && canMove(this.state, d.source, dest) ? key : null)
      ev.preventDefault()
    }

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    const onUp = (ev: PointerEvent) => {
      const d = this.dragRef
      cleanup()
      if (!d || !d.moved) {
        this.dragRef = null
        return // treated as a click; onClick handles it
      }
      this.suppressClick = true
      const key = targetKeyAt(ev.clientX, ev.clientY)
      const dest = key ? parseDest(key) : null
      const done = () => {
        this.dragRef = null
        this.endDrag()
      }
      if (dest && canMove(this.state, d.source, dest)) {
        done()
        this.commit(d.source, dest)
      } else {
        // Spring the ghost back to its origin, then dismiss it.
        const spring = { type: 'spring', stiffness: 600, damping: 40 } as const
        Promise.all([
          animate(this.ghostX, d.originX, spring).finished,
          animate(this.ghostY, d.originY, spring).finished,
        ]).then(done, done)
      }
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  private beginDrag(d: DragState): void {
    this.drag = d
  }
  private setDropKey(key: DropKey | null): void {
    this.dropKey = key
  }
  private endDrag(): void {
    this.drag = null
    this.dropKey = null
  }
}

export const store = new GameStore()

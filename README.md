# FreeCell (Windows XP edition)

A static, client-side React + TypeScript + Vite reimplementation of XP FreeCell.
State is managed with MobX; styled with Tailwind v4; drag-and-drop uses Motion.
Rules match the spec exactly; visuals are intentionally sparse for now.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest — deal vectors, rules, supermove capacity, autoplay
npm run typecheck  # tsc -b
npm run build      # tsc -b && vite build -> dist/
```

## Structure

Game logic (pure, framework-free, fully typed):

- `src/game/types.ts` — `GameState`, `Source`, `Dest`, `Stats`, `MoveResult`.
- `src/game/deck.ts` — card model + Microsoft LCG deal algorithm (§3, §4).
- `src/game/rules.ts` — pure legality predicates: tableau/foundation moves,
  run validity, supermove capacity, conservative autoplay, win/stuck (§5–§10).
- `src/game/engine.ts` — state creation, move application, autoplay-to-fixed-point,
  auto-finish, undo snapshots.
- `src/game/stats.ts` — statistics + in-progress game persistence (localStorage).
- `src/game/game.test.ts` — verifies the §16 checklist (deals #1 and #11982, etc.).

State + UI:

- `src/store.ts` — `GameStore`, a thin MobX class that wraps the pure engine.
  The board is an immutable `GameState` held in an `observable.ref`; each
  `@action` recomputes the next state via the engine, so the engine stays pure
  and testable and undo remains a plain snapshot stack. `@computed` values
  (`won`, `stuck`, `canFinish`, `canUndo`) replace `useMemo`; `reaction`s handle
  persistence and win-settling. Exported as a singleton `store`.
- `src/components/` — `observer` components that read the `store` directly:
  `Board`, `Column`, `Toolbar`, `DragGhost`, `StatsModal`, plus presentational
  building blocks `Card` (a self-contained playing card that owns its shape,
  corners and center pip), `Slot` (empty card-shaped placeholder), `Button`, and
  `suits.tsx` (SVG suit glyphs). `dnd.ts` holds the shared drag types. Styling
  lives in these components, not in shared class constants.
- `src/lib/cn.ts` — `cn()`, a clsx + tailwind-merge class combiner.
- `src/App.tsx` — composes the components.

## Design choices (where the spec left them open)

- **Undo:** unlimited (the spec's recommended modern upgrade). Each undo reverts one
  player move plus its bundled auto-plays. Undo is disabled once a game is won.
- **Interaction:** **Tap** a card or run to auto-send it to the best legal spot —
  a tableau column to build on (else an empty column), then the foundation, then a
  free cell. **Double-tap** a card to always send it to its foundation. **Drag**
  (mouse/touch/pen) for manual placement onto any legal target. `bestDest` in
  `engine.ts` encodes the tap priority and is unit-tested. Because the first click
  of a double-click fires immediately, a *bankable* card's single tap is deferred
  ~250 ms so a double-tap can override it; non-bankable taps act instantly.
- **"Started" threshold for stats:** a game counts once the first move is made.
  Abandoning a started, un-won game (New / Select / Restart) records a loss.
- **Autoplay:** Microsoft conservative rule by default (7♦ waits for both black 6s),
  run to a fixed point after every move. A "Finish" button appears when the board is
  trivially drainable and plays everything home.
- **Persistence:** stats and the current board survive a reload; the undo stack does
  not persist across reloads.

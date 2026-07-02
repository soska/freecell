# FreeCell (Windows XP edition)

A static, client-side React + TypeScript + Vite reimplementation of XP FreeCell.
Styled with Tailwind v4; drag-and-drop uses Motion. Rules match the spec exactly;
visuals are intentionally sparse for now.

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

UI:

- `src/hooks/useFreecell.ts` — owns all game + drag state and orchestrates moves.
- `src/components/` — `Board`, `Column`, `Card`, `Toolbar`, `DragGhost`,
  `StatsModal` (`dnd.ts` holds the shared drag types).
- `src/ui.ts` — `cx()` + shared Tailwind class constants.
- `src/App.tsx` — composes the hook and components.

## Design choices (where the spec left them open)

- **Undo:** unlimited (the spec's recommended modern upgrade). Each undo reverts one
  player move plus its bundled auto-plays. Undo is disabled once a game is won.
- **Interaction:** click-to-pick-up, click-to-drop. Clicking a card selects it plus
  every card below it (must form a valid run). Double-click sends a card to its
  foundation. Empty free cells / empty columns are clickable drop targets.
- **"Started" threshold for stats:** a game counts once the first move is made.
  Abandoning a started, un-won game (New / Select / Restart) records a loss.
- **Autoplay:** Microsoft conservative rule by default (7♦ waits for both black 6s),
  run to a fixed point after every move. A "Finish" button appears when the board is
  trivially drainable and plays everything home.
- **Persistence:** stats and the current board survive a reload; the undo stack does
  not persist across reloads.

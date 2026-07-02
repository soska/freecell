# FreeCell (Windows XP edition)

A static, client-side React/Vite reimplementation of XP FreeCell. Rules match the
spec exactly; visuals are intentionally sparse for now.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest — deal vectors, rules, supermove capacity, autoplay
npm run build    # static bundle in dist/
```

## Structure

- `src/game/deck.js` — card model + Microsoft LCG deal algorithm (§3, §4).
- `src/game/rules.js` — pure legality predicates: tableau/foundation moves,
  run validity, supermove capacity, conservative autoplay, win/stuck (§5–§10).
- `src/game/engine.js` — state creation, move application, autoplay-to-fixed-point,
  auto-finish, undo snapshots.
- `src/game/stats.js` — statistics + in-progress game persistence (localStorage).
- `src/game/game.test.js` — verifies the §16 checklist (deals #1 and #11982, etc.).
- `src/App.jsx` — UI + interactions.

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

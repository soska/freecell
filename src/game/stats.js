// Statistics + persistence via localStorage (§13, §14).
//
// "Started" threshold: a game counts once the first move is made.
// - Win  -> games won +1, current streak +1, longest streak updated.
// - Abandoning a started, un-won game (new/select/restart) -> games lost +1,
//   current streak reset to 0.

const STATS_KEY = 'freecell.stats'
const GAME_KEY = 'freecell.game'

const DEFAULT_STATS = {
  won: 0,
  lost: 0,
  currentStreak: 0,
  longestStreak: 0,
}

export function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return { ...DEFAULT_STATS }
    return { ...DEFAULT_STATS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_STATS }
  }
}

export function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function winPercent(stats) {
  const total = stats.won + stats.lost
  return total === 0 ? 0 : Math.round((stats.won / total) * 100)
}

export function recordWin(stats) {
  const currentStreak = stats.currentStreak + 1
  return {
    won: stats.won + 1,
    lost: stats.lost,
    currentStreak,
    longestStreak: Math.max(stats.longestStreak, currentStreak),
  }
}

export function recordLoss(stats) {
  return {
    won: stats.won,
    lost: stats.lost + 1,
    currentStreak: 0,
    longestStreak: stats.longestStreak,
  }
}

// ---- In-progress game persistence ------------------------------------------

export function saveGame(state) {
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(GAME_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearGame() {
  try {
    localStorage.removeItem(GAME_KEY)
  } catch {
    /* ignore */
  }
}

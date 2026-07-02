// Card & deck model + Microsoft deal algorithm (§3, §4).
//
// Card is represented as { rank: 1..13, suit: 'C'|'D'|'H'|'S' }.
// Ace = 1, Jack = 11, Queen = 12, King = 13.
// Red suits: D, H.  Black suits: C, S.

export const RANK_CHARS = 'A23456789TJQK' // index 0 => Ace
export const SUIT_CHARS = 'CDHS' // Clubs, Diamonds, Hearts, Spades
export const SUITS = ['C', 'D', 'H', 'S']
export const RED_SUITS = new Set(['D', 'H'])

export function isRed(card) {
  return RED_SUITS.has(card.suit)
}

export function color(card) {
  return isRed(card) ? 'red' : 'black'
}

export function sameColor(a, b) {
  return isRed(a) === isRed(b)
}

const SUIT_SYMBOLS = { C: '♣', D: '♦', H: '♥', S: '♠' }

// Human-readable label, e.g. "J♦".
export function cardLabel(card) {
  return RANK_CHARS[card.rank - 1] + SUIT_SYMBOLS[card.suit]
}

// Parse a 2-char code like "JD" into a card object.
export function parseCard(code) {
  const rank = RANK_CHARS.indexOf(code[0]) + 1
  const suit = code[1]
  return { rank, suit }
}

// Serialize a card back to its 2-char code, e.g. "JD".
export function cardCode(card) {
  return RANK_CHARS[card.rank - 1] + card.suit
}

// Deal per the Microsoft LCG algorithm (§4). Returns 8 columns of card codes,
// each ordered top -> bottom. Byte-identical to the reference implementation.
export function dealCodes(seed) {
  let state = seed >>> 0
  const rnd = () => {
    // Math.imul avoids precision loss: 214013 * state can exceed 2^53.
    state = (Math.imul(214013, state) + 2531011) & 0x7fffffff
    return state >>> 16
  }
  const deck = []
  for (let i = 0; i < 52; i++) {
    deck.push(RANK_CHARS[(i / 4) | 0] + SUIT_CHARS[i % 4])
  }
  const dealt = []
  let n = 52
  while (n > 0) {
    const idx = rnd() % n
    dealt.push(deck[idx])
    deck[idx] = deck[n - 1]
    n--
  }
  const cols = Array.from({ length: 8 }, () => [])
  dealt.forEach((card, i) => cols[i % 8].push(card))
  return cols
}

// Deal into card objects. Returns 8 columns, each ordered top -> bottom
// (last element is the bottom / movable card).
export function dealColumns(seed) {
  return dealCodes(seed).map((col) => col.map(parseCard))
}

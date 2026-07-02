// Card & deck model + Microsoft deal algorithm (§3, §4).
//
// Card is { rank: 1..13, suit: 'C'|'D'|'H'|'S' }. Ace = 1 … King = 13.
// Red suits: D, H. Black suits: C, S.

export type Suit = 'C' | 'D' | 'H' | 'S'
export interface Card {
  rank: number // 1..13
  suit: Suit
}

export const RANK_CHARS = 'A23456789TJQK' // index 0 => Ace
export const SUIT_CHARS = 'CDHS' // Clubs, Diamonds, Hearts, Spades
export const SUITS: Suit[] = ['C', 'D', 'H', 'S']
export const RED_SUITS = new Set<Suit>(['D', 'H'])

export const SUIT_SYMBOLS: Record<Suit, string> = {
  C: '♣',
  D: '♦',
  H: '♥',
  S: '♠',
}

export function isRed(card: Card): boolean {
  return RED_SUITS.has(card.suit)
}

export function color(card: Card): 'red' | 'black' {
  return isRed(card) ? 'red' : 'black'
}

export function sameColor(a: Card, b: Card): boolean {
  return isRed(a) === isRed(b)
}

// Human-readable label, e.g. "J♦".
export function cardLabel(card: Card): string {
  return RANK_CHARS[card.rank - 1] + SUIT_SYMBOLS[card.suit]
}

// Parse a 2-char code like "JD" into a card object.
export function parseCard(code: string): Card {
  return { rank: RANK_CHARS.indexOf(code[0]) + 1, suit: code[1] as Suit }
}

// Serialize a card back to its 2-char code, e.g. "JD".
export function cardCode(card: Card): string {
  return RANK_CHARS[card.rank - 1] + card.suit
}

// Deal per the Microsoft LCG algorithm (§4). Returns 8 columns of card codes,
// each ordered top -> bottom. Byte-identical to the reference implementation.
export function dealCodes(seed: number): string[][] {
  let state = seed >>> 0
  const rnd = (): number => {
    // Math.imul avoids precision loss: 214013 * state can exceed 2^53.
    state = (Math.imul(214013, state) + 2531011) & 0x7fffffff
    return state >>> 16
  }
  const deck: string[] = []
  for (let i = 0; i < 52; i++) {
    deck.push(RANK_CHARS[(i / 4) | 0] + SUIT_CHARS[i % 4])
  }
  const dealt: string[] = []
  let n = 52
  while (n > 0) {
    const idx = rnd() % n
    dealt.push(deck[idx])
    deck[idx] = deck[n - 1]
    n--
  }
  const cols: string[][] = Array.from({ length: 8 }, () => [])
  dealt.forEach((card, i) => cols[i % 8].push(card))
  return cols
}

// Deal into card objects. Returns 8 columns, each ordered top -> bottom
// (last element is the bottom / movable card).
export function dealColumns(seed: number): Card[][] {
  return dealCodes(seed).map((col) => col.map(parseCard))
}

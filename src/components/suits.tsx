import type { FC, SVGProps } from 'react'
import type { Suit } from '../game/deck'

// Suit glyphs as inline SVG components. They paint with `currentColor`, so the
// surrounding text color (red/black) drives the fill — size them via className.
type IconProps = SVGProps<SVGSVGElement>

export const Spade: FC<IconProps> = (props) => (
  <svg viewBox="0 0 600 600" fill="currentColor" aria-hidden {...props}>
    <g transform="rotate(225,300,300)">
      <rect width="300" height="300" x="200" y="200" />
      <circle cx="200" cy="350" r="150" />
      <circle cx="350" cy="200" r="150" />
    </g>
    <path d="M300,300 Q300,500 200,600 H400 Q300,500 300,300" />
  </svg>
)

export const Club: FC<IconProps> = (props) => (
  <svg viewBox="0 0 600 600" fill="currentColor" aria-hidden {...props}>
    <circle cx="180" cy="350" r="140" />
    <circle cx="300" cy="150" r="140" />
    <circle cx="420" cy="350" r="140" />
    <path d="M300,300 Q 300,500 200,600 H400 Q300,500 300,300" />
  </svg>
)

export const Diamond: FC<IconProps> = (props) => (
  <svg viewBox="0 0 600 600" fill="currentColor" aria-hidden {...props}>
    <rect x="100" y="100" width="400" height="400" transform="rotate(45,300,300)" />
  </svg>
)

export const Heart: FC<IconProps> = (props) => (
  <svg viewBox="0 0 600 600" fill="currentColor" aria-hidden {...props}>
    <g transform="rotate(45,300,300)">
      <rect x="150" y="150" height="350" width="350" />
      <circle cx="150" cy="325" r="175" />
      <circle cx="325" cy="150" r="175" />
    </g>
  </svg>
)

const ICONS: Record<Suit, FC<IconProps>> = {
  S: Spade,
  C: Club,
  D: Diamond,
  H: Heart,
}

export const SuitIcon: FC<IconProps & { suit: Suit }> = ({ suit, ...rest }) => {
  const Icon = ICONS[suit]
  return <Icon {...rest} />
}

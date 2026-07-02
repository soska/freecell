// Shared class-name helpers and utility-class strings for the UI.

export type ClassValue = string | false | null | undefined

// Join truthy class fragments.
export const cx = (...c: ClassValue[]): string => c.filter(Boolean).join(' ')

export const BTN =
  'px-3 py-1.5 border border-gray-300 rounded bg-white text-sm cursor-pointer ' +
  'hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default'

// A single-card holder (free cell / foundation): fills its grid column, keeps a
// playing-card aspect ratio, and scales with the viewport.
export const SLOT =
  'aspect-[5/7] w-full border border-gray-300 rounded-lg bg-white flex ' +
  'items-center justify-center cursor-pointer select-none'

// A tableau card: full column width, fixed readable height, overlapped so each
// card's rank corner peeks out above the one below it.
export const CARD =
  'h-[clamp(3.5rem,7vw,6rem)] -mb-[clamp(2rem,4.6vw,4rem)] w-full rounded-lg ' +
  'border border-gray-300 px-2 pt-1 select-none'

// Rank/suit label sizing that grows with the screen.
export const LABEL = 'font-bold leading-none text-[clamp(1rem,2.3vw,2.25rem)]'
export const LABEL_LG = 'font-bold leading-none text-[clamp(1.25rem,3vw,3rem)]'

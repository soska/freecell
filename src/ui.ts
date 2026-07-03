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

// A tableau card: a full playing-card rectangle (5:7) filling its column width,
// overlapped so each covered card shows only its top corner. The negative bottom
// margin is a percentage of the card's WIDTH (per CSS): at 5:7 the height is
// 140% of width, so -mb-[105%] leaves the top ~35% (the rank/suit) visible. The
// last card in a stack resets its margin so it renders in full.
export const CARD =
  'aspect-[5/7] w-full -mb-[105%] last:mb-0 rounded-lg border border-gray-300 ' +
  'px-2 pt-1.5 select-none'

// Rank/suit label sizing that grows with the screen.
export const LABEL = 'font-bold leading-none text-[clamp(1rem,2.3vw,2.25rem)]'
export const LABEL_LG = 'font-bold leading-none text-[clamp(1.25rem,3vw,3rem)]'

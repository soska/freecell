import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

// An empty, card-shaped placeholder (free cell, empty column, empty foundation).
export function Slot({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex aspect-[5/7] w-full items-center justify-center rounded-lg border border-gray-300 bg-white',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

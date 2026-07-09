import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

// An empty, card-shaped placeholder (free cell, empty column, empty foundation).
export function Slot({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'card-size flex items-center justify-center rounded-lg border-2 border-gray-700 shadow-inner shadow-black/20 bg-green-600',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

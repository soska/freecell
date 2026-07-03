import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

export function Button({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'cursor-pointer rounded border border-gray-300 bg-white px-3 py-1.5 text-sm',
        'hover:bg-gray-50 disabled:cursor-default disabled:opacity-40',
        className,
      )}
      {...props}
    />
  )
}

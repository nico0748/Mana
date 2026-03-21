import * as React from "react"
import { cn } from "../../lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2",
          "text-sm text-zinc-100 placeholder:text-zinc-600",
          "transition-all duration-200 ease-out",
          "hover:border-zinc-600 hover:bg-zinc-800",
          // Focus: 青いリングではなく白いフォーカスで統一感
          "focus-visible:outline-none focus-visible:border-zinc-400 focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:bg-zinc-800",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

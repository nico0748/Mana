import * as React from "react"
import { cn } from "../../lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "fab"
  size?: "default" | "sm" | "lg" | "icon"
  isLoading?: boolean
}

/** Material Design ripple effect */
function spawnRipple(e: React.MouseEvent<HTMLButtonElement>) {
  const btn = e.currentTarget
  const rect = btn.getBoundingClientRect()
  const d = Math.max(btn.offsetWidth, btn.offsetHeight)
  const span = document.createElement("span")
  span.className = "md-ripple"
  span.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - rect.left - d / 2}px;top:${e.clientY - rect.top - d / 2}px`
  btn.appendChild(span)
  span.addEventListener("animationend", () => span.remove())
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, children, onClick, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!props.disabled && !isLoading) spawnRipple(e)
      onClick?.(e)
    }

    return (
      <button
        className={cn(
          // Base — Material Design button foundation
          "relative overflow-hidden inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
          "disabled:pointer-events-none disabled:opacity-50",
          "active:scale-[0.97]",
          // Variants
          variant === "default"     && "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-md shadow-emerald-900/40 hover:shadow-lg hover:shadow-emerald-900/50 font-semibold",
          variant === "outline"     && "border border-zinc-600 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-500",
          variant === "ghost"       && "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
          variant === "destructive" && "bg-red-600 text-white hover:bg-red-500 shadow-md shadow-red-950/40",
          variant === "fab"         && "bg-emerald-500 text-zinc-950 shadow-xl shadow-emerald-900/50 hover:bg-emerald-400 hover:shadow-2xl h-14 w-14 rounded-2xl",
          // Sizes
          size === "default" && variant !== "fab" && "h-10 px-5 py-2",
          size === "sm"      && variant !== "fab" && "h-9 px-3 text-xs",
          size === "lg"      && variant !== "fab" && "h-11 px-8",
          size === "icon"    && variant !== "fab" && "h-10 w-10",
          className
        )}
        ref={ref}
        disabled={isLoading || props.disabled}
        onClick={handleClick}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }

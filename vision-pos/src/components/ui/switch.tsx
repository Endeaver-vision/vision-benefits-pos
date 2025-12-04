"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  id?: string
  className?: string
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled = false, id, ...props }, ref) => {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        id={id}
        className={cn(
          "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked
            ? "bg-gradient-to-r from-primary to-primary-hover shadow-sm shadow-primary/25"
            : "bg-white/15 border border-white/20",
          className
        )}
        onClick={() => !disabled && onCheckedChange?.(!checked)}
        ref={ref}
        {...props}
      >
        <div
          className={cn(
            "pointer-events-none block h-6 w-6 rounded-full shadow-md transition-all duration-200",
            checked
              ? "translate-x-5 bg-white"
              : "translate-x-0 bg-white/80"
          )}
        />
      </button>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }

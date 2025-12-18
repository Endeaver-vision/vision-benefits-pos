import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Use specific transitions to avoid backdrop-filter rendering bugs during scroll
        "h-11 w-full min-w-0 rounded-2xl px-4 py-2.5 text-base transition-[background-color,border-color,box-shadow] duration-200 transform-gpu",
        "bg-white/[0.08] backdrop-blur-sm border border-white/15",
        "text-foreground placeholder:text-muted-foreground",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        "hover:bg-white/[0.1] hover:border-white/20",
        "focus:bg-white/[0.12] focus:border-primary focus:ring-[3px] focus:ring-primary/20 focus:outline-none",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:text-foreground file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "selection:bg-primary/30 selection:text-foreground",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }

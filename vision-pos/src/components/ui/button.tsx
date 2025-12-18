import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Use specific transitions instead of transition-all to avoid backdrop-filter rendering bugs during scroll
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-[background-color,border-color,box-shadow,transform,opacity] duration-200 transform-gpu disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-primary to-primary-hover text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] border border-primary/50",
        destructive:
          "bg-gradient-to-b from-destructive to-red-700 text-white shadow-lg shadow-destructive/25 hover:shadow-xl hover:shadow-destructive/30 hover:scale-[1.02] active:scale-[0.98] border border-destructive/50",
        outline:
          "border border-white/20 bg-white/5 backdrop-blur-sm text-foreground hover:bg-white/10 hover:border-white/30 active:scale-[0.98]",
        secondary:
          "bg-white/10 backdrop-blur-sm text-foreground border border-white/10 hover:bg-white/15 hover:border-white/20 active:scale-[0.98]",
        ghost:
          "text-foreground hover:bg-white/10 active:scale-[0.98]",
        link:
          "text-primary underline-offset-4 hover:underline",
        success:
          "bg-gradient-to-b from-success to-emerald-700 text-white shadow-lg shadow-success/25 hover:shadow-xl hover:shadow-success/30 hover:scale-[1.02] active:scale-[0.98] border border-success/50",
        warning:
          "bg-gradient-to-b from-warning to-amber-700 text-white shadow-lg shadow-warning/25 hover:shadow-xl hover:shadow-warning/30 hover:scale-[1.02] active:scale-[0.98] border border-warning/50",
        glass:
          "bg-white/10 backdrop-blur-md text-foreground border border-white/20 shadow-lg hover:bg-white/15 hover:border-white/30 hover:shadow-xl active:scale-[0.98]",
      },
      size: {
        default: "h-11 px-5 py-2.5 rounded-2xl",
        sm: "h-9 px-4 rounded-xl text-xs",
        lg: "h-12 px-8 rounded-2xl text-base",
        xl: "h-14 px-10 rounded-3xl text-lg",
        icon: "size-11 rounded-2xl",
        "icon-sm": "size-9 rounded-xl",
        "icon-lg": "size-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

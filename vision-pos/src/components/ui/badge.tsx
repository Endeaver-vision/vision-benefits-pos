import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-primary to-primary-hover border-primary/50 text-primary-foreground shadow-sm shadow-primary/20",
        secondary:
          "bg-white/10 backdrop-blur-sm border-white/20 text-foreground",
        destructive:
          "bg-gradient-to-b from-destructive to-red-700 border-destructive/50 text-white shadow-sm shadow-destructive/20",
        success:
          "bg-gradient-to-b from-success to-emerald-700 border-success/50 text-white shadow-sm shadow-success/20",
        warning:
          "bg-gradient-to-b from-warning to-amber-700 border-warning/50 text-white shadow-sm shadow-warning/20",
        outline:
          "bg-transparent border-white/30 text-foreground hover:bg-white/10",
        glass:
          "bg-white/10 backdrop-blur-md border-white/20 text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]",
        blue:
          "bg-gradient-to-b from-blue-500 to-blue-600 border-blue-500/50 text-white shadow-sm shadow-blue-500/20",
        purple:
          "bg-gradient-to-b from-purple-500 to-purple-600 border-purple-500/50 text-white shadow-sm shadow-purple-500/20",
        teal:
          "bg-gradient-to-b from-teal-500 to-teal-600 border-teal-500/50 text-white shadow-sm shadow-teal-500/20",
        orange:
          "bg-gradient-to-b from-orange-500 to-orange-600 border-orange-500/50 text-white shadow-sm shadow-orange-500/20",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

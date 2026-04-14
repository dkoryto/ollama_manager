import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[8px] border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-[rgba(59,130,246,0.5)] active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[#242424] text-white hover:opacity-70 shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]",
        outline:
          "bg-white text-[#242424] shadow-[rgba(34,42,53,0.08)_0px_0px_0px_1px] hover:bg-[#f5f5f5]",
        secondary:
          "bg-[#f5f5f5] text-[#242424] hover:bg-[#ebebeb]",
        ghost:
          "hover:bg-[#f5f5f5] hover:text-[#242424]",
        destructive:
          "bg-red-50 text-red-600 hover:bg-red-100",
        link: "text-[#0099ff] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-3.5",
        xs: "h-6 gap-1 rounded-[4px] px-2 text-xs",
        sm: "h-7 gap-1 rounded-[6px] px-2.5 text-[0.8rem]",
        lg: "h-10 gap-1.5 px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-[4px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-[6px]",
        "icon-lg": "size-10",
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
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

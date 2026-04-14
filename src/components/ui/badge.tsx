import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[9999px] border border-transparent px-2 py-0.5 text-xs font-semibold whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-[rgba(59,130,246,0.5)] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-[#242424] text-white",
        secondary: "bg-[#f5f5f5] text-[#242424]",
        destructive: "bg-red-50 text-red-600",
        outline:
          "border-[rgba(34,42,53,0.08)] text-[#242424] bg-white",
        ghost: "hover:bg-[#f5f5f5] text-[#242424]",
        link: "text-[#0099ff] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }

"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-[9999px] border-2 border-transparent bg-[#f5f5f5] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(59,130,246,0.5)] disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-[#242424]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-transform data-[checked]:translate-x-4"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }

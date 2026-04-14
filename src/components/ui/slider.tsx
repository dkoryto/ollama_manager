"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

function Slider({
  className,
  ...props
}: Omit<SliderPrimitive.Root.Props, "className"> & {
  className?: string
}) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[#f5f5f5]">
        <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-[#242424]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        className="block size-4 rounded-full border border-[rgba(34,42,53,0.08)] bg-white shadow-[rgba(34,42,53,0.08)_0px_0px_0px_1px,rgba(34,42,53,0.05)_0px_2px_4px] transition-[color,box-shadow] hover:bg-[#f5f5f5] focus-visible:ring-2 focus-visible:ring-[rgba(59,130,246,0.5)]"
      />
    </SliderPrimitive.Root>
  )
}

export { Slider }

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-[8px] border border-[rgba(34,42,53,0.08)] bg-white px-3 py-1 text-sm text-[#242424] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#242424] placeholder:text-[#898989] focus-visible:border-[rgba(59,130,246,0.5)] focus-visible:ring-2 focus-visible:ring-[rgba(59,130,246,0.5)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:opacity-50 aria-invalid:border-red-300 aria-invalid:ring-2 aria-invalid:ring-red-200",
        className
      )}
      {...props}
    />
  )
}

export { Input }

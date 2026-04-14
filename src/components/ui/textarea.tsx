import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-[8px] border border-[rgba(34,42,53,0.08)] bg-white px-3 py-2 text-sm text-[#242424] transition-colors outline-none placeholder:text-[#898989] focus-visible:border-[rgba(59,130,246,0.5)] focus-visible:ring-2 focus-visible:ring-[rgba(59,130,246,0.5)] disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:opacity-50 aria-invalid:border-red-300 aria-invalid:ring-2 aria-invalid:ring-red-200",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

export function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[#242424] group-[.toaster]:border-[rgba(34,42,53,0.08)] group-[.toaster]:shadow-card group-[.toaster]:rounded-[8px]",
          description: "group-[.toast]:text-[#898989]",
          actionButton:
            "group-[.toast]:bg-[#242424] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[#f5f5f5] group-[.toaster]:text-[#898989]",
        },
      }}
      {...props}
    />
  )
}

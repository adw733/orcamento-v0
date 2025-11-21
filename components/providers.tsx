"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { NavigationProvider } from "@/lib/navigation-context"
import { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <NavigationProvider>
        {children}
      </NavigationProvider>
    </ThemeProvider>
  )
}

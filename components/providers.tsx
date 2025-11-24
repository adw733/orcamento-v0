"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { NavigationProvider } from "@/lib/navigation-context"
import { DataCacheProvider } from "@/lib/data-cache"
import { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <DataCacheProvider>
        <NavigationProvider>
          {children}
        </NavigationProvider>
      </DataCacheProvider>
    </ThemeProvider>
  )
}

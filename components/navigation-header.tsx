"use client"

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigation } from '@/lib/navigation-context'

interface NavigationHeaderProps {
  className?: string
}

export function NavigationHeader({ 
  className = ""
}: NavigationHeaderProps) {
  const { canGoBack, goBack } = useNavigation()

  if (!canGoBack) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={goBack}
      className={`w-fit hover:bg-primary/10 text-muted-foreground hover:text-primary ${className}`}
    >
      <ArrowLeft className="h-4 w-4 mr-1" />
      Voltar
    </Button>
  )
}

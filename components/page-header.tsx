"use client"

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigation } from '@/lib/navigation-context'
import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: ReactNode // Botões de ação
  badge?: ReactNode // Badge ou indicador extra (ex: número do orçamento)
  className?: string
  showBackButton?: boolean
}

export function PageHeader({ 
  title,
  subtitle,
  children,
  badge,
  className = "",
  showBackButton = true
}: PageHeaderProps) {
  let canGoBack = false
  let goBack = () => {}

  try {
    const navigation = useNavigation()
    canGoBack = navigation.canGoBack
    goBack = navigation.goBack
  } catch (error) {
    // Durante SSR/prerender, o NavigationProvider pode não estar disponível
  }

  return (
    <header className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      <div className="px-4 py-3 md:px-6 md:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Área Esquerda - Navegação + Título */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Botão Voltar */}
            {showBackButton && canGoBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="shrink-0 h-9 w-9 p-0 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-lg"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            {/* Título e Subtítulo */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
                  {title}
                </h1>
                {badge}
              </div>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Área Direita - Botões de Ação */}
          {children && (
            <div className="flex items-center gap-2 flex-wrap justify-start md:justify-end shrink-0">
              {children}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// Componente auxiliar para botões de ação padronizados
interface HeaderActionProps {
  icon?: ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline'
  className?: string
}

export function HeaderAction({
  icon,
  label,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  className = ""
}: HeaderActionProps) {
  const variantStyles = {
    primary: 'bg-primary hover:bg-primary/90 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    outline: 'border border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
  }

  return (
    <Button
      size="sm"
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        h-9 px-3 text-sm font-medium rounded-lg
        flex items-center gap-2
        transition-all duration-200
        shadow-sm hover:shadow
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}

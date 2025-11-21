"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface NavigationHistoryItem {
  path: string
  label: string
  timestamp: number
}

interface NavigationContextType {
  history: NavigationHistoryItem[]
  pushNavigation: (path: string, label: string) => void
  goBack: () => void
  canGoBack: boolean
  currentPath: string
  getBreadcrumbs: () => NavigationHistoryItem[]
  clearHistory: () => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

const STORAGE_KEY = 'onebase_navigation_history'
const MAX_HISTORY = 10

export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [history, setHistory] = useState<NavigationHistoryItem[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Carregar histórico do sessionStorage na inicialização
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            setHistory(parsed)
          }
        } catch (e) {
          console.warn('Erro ao carregar histórico de navegação:', e)
        }
      }
      setIsInitialized(true)
    }
  }, [])

  // Salvar histórico no sessionStorage sempre que mudar
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    }
  }, [history, isInitialized])

  // Atualizar histórico quando pathname/search params mudam
  useEffect(() => {
    if (!isInitialized) return

    const currentPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const fullPath = currentPath + hash

    // Não adicionar duplicatas consecutivas
    if (history.length > 0 && history[history.length - 1].path === fullPath) {
      return
    }

    // Mapear paths para labels amigáveis
    const getLabel = (path: string): string => {
      if (path.includes('/orcamento-otimizado')) {
        const id = new URLSearchParams(path.split('?')[1] || '').get('id')
        return id ? `Orçamento (ID: ${id.substring(0, 8)}...)` : 'Orçamento Otimizado'
      }
      if (path.includes('#orcamento')) return 'Edição de Orçamento'
      if (path.includes('#clientes')) return 'Clientes'
      if (path.includes('#produtos')) return 'Produtos'
      if (path.includes('#materiais')) return 'Materiais'
      if (path.includes('#empresa')) return 'Empresa'
      if (path.includes('#orcamentos')) return 'Todos Orçamentos'
      if (path.includes('#dashboard')) return 'Dashboard Financeiro'
      if (path.includes('#gastos-receitas')) return 'Gastos e Receitas'
      if (path.includes('#lixeira')) return 'Lixeira'
      return 'Página'
    }

    const newItem: NavigationHistoryItem = {
      path: fullPath,
      label: getLabel(fullPath),
      timestamp: Date.now()
    }

    setHistory(prev => {
      const newHistory = [...prev, newItem]
      // Manter apenas últimas MAX_HISTORY entradas
      return newHistory.slice(-MAX_HISTORY)
    })
  }, [pathname, searchParams, isInitialized])

  const pushNavigation = (path: string, label: string) => {
    const newItem: NavigationHistoryItem = {
      path,
      label,
      timestamp: Date.now()
    }
    setHistory(prev => {
      const newHistory = [...prev, newItem]
      return newHistory.slice(-MAX_HISTORY)
    })
  }

  const goBack = () => {
    if (history.length > 1) {
      // Remove current page
      const newHistory = history.slice(0, -1)
      setHistory(newHistory)
      
      // Navigate to previous page
      const previousPage = newHistory[newHistory.length - 1]
      if (previousPage) {
        // Verificar se é uma navegação com hash
        if (previousPage.path.includes('#')) {
          window.location.href = previousPage.path
        } else {
          router.push(previousPage.path)
        }
      }
    } else {
      // Fallback para página inicial
      router.push('/')
    }
  }

  const getBreadcrumbs = (): NavigationHistoryItem[] => {
    // Retorna últimos 3 itens para breadcrumbs
    return history.slice(-3)
  }

  const clearHistory = () => {
    setHistory([])
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }

  const value: NavigationContextType = {
    history,
    pushNavigation,
    goBack,
    canGoBack: history.length > 1,
    currentPath: pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''),
    getBreadcrumbs,
    clearHistory
  }

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigation deve ser usado dentro de NavigationProvider')
  }
  return context
}

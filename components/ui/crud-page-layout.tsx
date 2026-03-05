"use client"

import type React from "react"
import { Search, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface CrudPageLayoutProps {
    /** Título da página, ex: "Clientes" */
    title: string
    /** Ícone do título (componente React) */
    icon?: React.ReactNode
    /** Total de itens cadastrados */
    totalItems: number
    /** Label para a contagem, ex: "clientes cadastrados" */
    itemLabel?: string
    /** Valor do campo de pesquisa */
    searchValue: string
    /** Callback ao digitar na pesquisa */
    onSearchChange: (value: string) => void
    /** Placeholder do campo de pesquisa */
    searchPlaceholder?: string
    /** Texto do botão "Novo" */
    newButtonLabel?: string
    /** Callback ao clicar em "Novo" */
    onNew: () => void
    /** Botões extras ao lado do "Novo" */
    extraActions?: React.ReactNode
    /** Conteúdo principal (tabela) */
    children: React.ReactNode
    /** Conteúdo do rodapé (paginação) */
    footer?: React.ReactNode
    /** Se está carregando */
    isLoading?: boolean
    /** Mensagem de erro */
    error?: string | null
}

export function CrudPageLayout({
    title,
    icon,
    totalItems,
    itemLabel = "itens cadastrados",
    searchValue,
    onSearchChange,
    searchPlaceholder = "Pesquisar...",
    newButtonLabel = "Novo",
    onNew,
    extraActions,
    children,
    footer,
    isLoading,
    error,
}: CrudPageLayoutProps) {
    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {icon && (
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
                            {icon}
                        </div>
                    )}
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                        <p className="text-sm text-muted-foreground">
                            {isLoading ? "Carregando..." : `${totalItems} ${itemLabel}`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
                    <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p>{error}</p>
                </div>
            )}

            {/* Toolbar: Search + Actions */}
            <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9 h-10"
                    />
                </div>
                <div className="flex items-center gap-2">
                    {extraActions}
                    <Button onClick={onNew} className="h-10 gap-2 shadow-sm">
                        <Plus className="h-4 w-4" />
                        {newButtonLabel}
                    </Button>
                </div>
            </div>

            {/* Main Content (Table) */}
            <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                {children}
            </div>

            {/* Footer (Pagination) */}
            {footer && (
                <div className="flex items-center justify-between">
                    {footer}
                </div>
            )}
        </div>
    )
}

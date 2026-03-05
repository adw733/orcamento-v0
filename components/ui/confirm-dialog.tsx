"use client"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmDialogProps {
    /** Controla a visibilidade do dialog */
    open: boolean
    /** Callback ao fechar */
    onOpenChange: (open: boolean) => void
    /** Título do dialog */
    title: string
    /** Descrição/texto do body */
    description: string
    /** Label do botão de confirmação */
    confirmLabel?: string
    /** Label do botão de cancelar */
    cancelLabel?: string
    /** Variante destrutiva (vermelho) */
    destructive?: boolean
    /** Callback ao confirmar */
    onConfirm: () => void
    /** Se está processando */
    isLoading?: boolean
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    destructive = false,
    onConfirm,
    isLoading = false,
}: ConfirmDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>
                        {cancelLabel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault()
                            onConfirm()
                        }}
                        disabled={isLoading}
                        className={destructive ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                    >
                        {isLoading ? "Processando..." : confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"

export function OrcamentoOtimizadoClientLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const [abaAtiva, setAbaAtiva] = useState("orcamento-otimizado")

    const handleAbaChange = (aba: string) => {
        if (aba === "orcamento-otimizado") {
            // Já estamos aqui
            return
        }
        // Redirecionar para a home com a hash correta
        router.push(`/#${aba}`)
    }

    const handleCriarNovoOrcamento = () => {
        router.push("/#orcamento")
    }

    return (
        <SidebarProvider>
            <AppSidebar
                abaAtiva={abaAtiva}
                setAbaAtiva={handleAbaChange}
                criandoNovoOrcamento={false}
                criarNovoOrcamento={handleCriarNovoOrcamento}
            />
            <SidebarInset>
                {children}
            </SidebarInset>
        </SidebarProvider>
    )
}

"use client"

import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import ListaOrcamentos from "@/components/lista-orcamentos"
import { useRef } from "react"

export default function OrcamentosFinalizadosPage() {
  const router = useRouter()
  const recarregarOrcamentosRef = useRef<(() => Promise<void>) | null>(null)

  const handleSelectOrcamento = (orcamentoId: string) => {
    router.push(`/orcamento-otimizado?id=${orcamentoId}`)
  }

  const handleNovoOrcamento = () => {
    router.push("/orcamento-otimizado")
  }

  const handleDeleteOrcamento = async (orcamentoId: string) => {
    console.log("Delete orçamento:", orcamentoId)
  }

  const handleAbrirOtimizado = (orcamentoId: string) => {
    router.push(`/orcamento-otimizado?id=${orcamentoId}`)
  }

  return (
    <>
      <PageHeader
        title="Orçamentos Finalizados"
        subtitle="Consulte o histórico de orçamentos finalizados"
      >
        <Button
          size="sm"
          onClick={handleNovoOrcamento}
          className="h-9 px-3 text-sm font-medium bg-primary hover:bg-primary/90 text-white rounded-lg shadow-sm"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Novo Orçamento
        </Button>
      </PageHeader>

      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-3 md:p-4">
          <ListaOrcamentos
            onSelectOrcamento={handleSelectOrcamento}
            onNovoOrcamento={handleNovoOrcamento}
            onDeleteOrcamento={handleDeleteOrcamento}
            onAbrirOtimizado={handleAbrirOtimizado}
            reloadRef={recarregarOrcamentosRef}
            filtroStatus="1"
          />
        </CardContent>
      </Card>
    </>
  )
}

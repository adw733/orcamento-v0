"use client"

import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import LixeiraOrcamentos from "@/components/lixeira-orcamentos"
import { useRef } from "react"

export default function LixeiraPage() {
  const recarregarLixeiraRef = useRef(null)

  const handleRestaurarOrcamento = async (orcamentoId: string) => {
    // Implement restoration logic
    console.log("Restaurar orçamento:", orcamentoId)
  }

  const handleExcluirPermanentemente = async (orcamentoId: string) => {
    // Implement permanent delete logic
    console.log("Excluir permanentemente:", orcamentoId)
  }

  return (
    <>
      <PageHeader
        title="Lixeira de Orçamentos"
        subtitle="Gerencie orçamentos excluídos e restaure-os se necessário"
      />
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-3 md:p-4">
          <LixeiraOrcamentos
            onRestaurarOrcamento={handleRestaurarOrcamento}
            onExcluirPermanentemente={handleExcluirPermanentemente}
            reloadRef={recarregarLixeiraRef}
          />
        </CardContent>
      </Card>
    </>
  )
}

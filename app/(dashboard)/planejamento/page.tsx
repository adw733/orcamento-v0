"use client"

import { PageHeader } from "@/components/page-header"
import PlanejamentoFluxo from "@/components/planejamento-fluxo"

export default function PlanejamentoPage() {
  return (
    <>
      <PageHeader
        title="Planejamento de Produção"
        subtitle="Sistema de fluxos e cronograma visual"
      />
      <div className="h-[calc(100vh-8rem)] -mx-2 md:-mx-4 -mb-2 md:-mb-3">
        <PlanejamentoFluxo onHeaderActions={() => {}} />
      </div>
    </>
  )
}

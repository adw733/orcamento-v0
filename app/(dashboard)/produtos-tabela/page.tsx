"use client"

import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import TabelaProdutos from "@/components/tabela-produtos"

export default function ProdutosTabelaPage() {
  return (
    <>
      <PageHeader
        title="Tabela de Produtos"
        subtitle="Visualize e edite seus produtos em formato de tabela"
      />
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-3 md:p-4">
          <TabelaProdutos />
        </CardContent>
      </Card>
    </>
  )
}

"use client"

import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import GerenciadorEmpresa from "@/components/gerenciador-empresa"

export default function EmpresaPage() {
  return (
    <>
      <PageHeader
        title="Gerenciador de Empresa"
        subtitle="Gerencie os dados da sua empresa"
      />
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-3 md:p-4">
          <GerenciadorEmpresa />
        </CardContent>
      </Card>
    </>
  )
}

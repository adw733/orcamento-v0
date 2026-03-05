"use client"

import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import GerenciadorMateriais from "@/components/gerenciador-materiais"

export default function MateriaisPage() {
  return (
    <>
      <PageHeader
        title="Gerenciador de Materiais"
        subtitle="Gerencie os materiais disponíveis"
      />
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-3 md:p-4">
          <GerenciadorMateriais />
        </CardContent>
      </Card>
    </>
  )
}

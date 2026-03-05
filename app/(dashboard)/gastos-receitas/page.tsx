"use client"

import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import GerenciadorGastosReceitas from "@/components/gerenciador-gastos-receitas"

export default function GastosReceitasPage() {
  return (
    <>
      <PageHeader
        title="Gastos e Receitas"
        subtitle="Gerencie os gastos e receitas da empresa"
      />
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-3 md:p-4">
          <GerenciadorGastosReceitas />
        </CardContent>
      </Card>
    </>
  )
}

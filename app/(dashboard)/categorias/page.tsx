"use client"

import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import GerenciadorCategorias from "@/components/gerenciador-categorias"

export default function CategoriasPage() {
  return (
    <>
      <PageHeader
        title="Gerenciador de Categorias"
        subtitle="Gerencie as categorias de produtos"
      />
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-3 md:p-4">
          <GerenciadorCategorias />
        </CardContent>
      </Card>
    </>
  )
}

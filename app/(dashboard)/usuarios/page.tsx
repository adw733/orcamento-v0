"use client"

import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import GerenciadorUsuarios from "@/components/gerenciador-usuarios"

export default function UsuariosPage() {
  return (
    <>
      <PageHeader
        title="Gerenciador de Usuários"
        subtitle="Gerencie os usuários do sistema"
      />
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-3 md:p-4">
          <GerenciadorUsuarios />
        </CardContent>
      </Card>
    </>
  )
}

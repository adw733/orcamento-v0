"use client"

import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import DashboardFinanceiro from "@/components/dashboard-financeiro"

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard Financeiro"
        subtitle="Análise financeira e DRE da sua empresa"
      />
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-3 md:p-4">
          <DashboardFinanceiro />
        </CardContent>
      </Card>
    </>
  )
}

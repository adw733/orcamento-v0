import DashboardFinanceiro from "@/components/dashboard-financeiro"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard Financeiro",
  description: "Análise financeira e DRE da sua empresa",
}

export default function DashboardPage() {
  return <DashboardFinanceiro />
}

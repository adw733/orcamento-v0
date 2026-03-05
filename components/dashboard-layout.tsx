"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { usePathname, useRouter } from "next/navigation"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Slash } from "lucide-react"
import { ReactNode } from "react"

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Generate breadcrumb from pathname
  const getBreadcrumbItems = () => {
    const segments = pathname.split("/").filter(Boolean)

    // Remove (dashboard) from segments if present
    const cleanSegments = segments.filter(s => s !== "(dashboard)")

    return cleanSegments.map((segment, index) => {
      const isLast = index === cleanSegments.length - 1
      const label = formatBreadcrumbLabel(segment)
      const href = "/" + cleanSegments.slice(0, index + 1).join("/")

      return { label, href, isLast }
    })
  }

  const breadcrumbItems = getBreadcrumbItems()

  // Get current route for sidebar highlighting
  const currentRoute = pathname.split("/").pop() || "orcamentos"

  const handleSidebarNavigate = (aba: string) => {
    router.push(`/${aba}`)
  }

  const handleNovoOrcamento = () => {
    router.push("/orcamento-otimizado")
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-2rem)]">
      <AppSidebar
        abaAtiva={currentRoute}
        setAbaAtiva={handleSidebarNavigate}
        criandoNovoOrcamento={false}
        criarNovoOrcamento={handleNovoOrcamento}
      />
      <SidebarInset className="bg-gray-50 overflow-auto flex-1 w-full">
        <div className="p-2 md:p-4 space-y-2 md:space-y-3">
          {/* Breadcrumb */}
          {breadcrumbItems.length > 0 && (
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/orcamentos">Início</BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbItems.map((item, index) => (
                  <div key={item.href} className="flex items-center gap-1">
                    <BreadcrumbSeparator>
                      <Slash className="h-4 w-4" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                      {item.isLast ? (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}

          {children}
        </div>
      </SidebarInset>
    </div>
  )
}

// Helper to format breadcrumb labels
function formatBreadcrumbLabel(segment: string): string {
  const labels: Record<string, string> = {
    "dashboard": "Dashboard",
    "orcamentos": "Orçamentos",
    "clientes": "Clientes",
    "produtos": "Produtos",
    "categorias": "Categorias",
    "materiais": "Materiais",
    "planejamento": "Planejamento",
    "lixeira": "Lixeira",
    "empresa": "Empresa",
    "usuarios": "Usuários",
    "gastos-receitas": "Gastos e Receitas",
    "orcamento-otimizado": "Edição de Orçamento",
    "login": "Login",
    "cadastro": "Cadastro",
  }

  return labels[segment] || segment
}

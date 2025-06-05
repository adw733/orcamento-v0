"use client"

import { useEffect, useState } from "react"
import {
  FileText,
  Users,
  ShoppingBag,
  Save,
  Trash2,
  Table,
  Plus,
  ChevronLeft,
  ChevronRight,
  Palette,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppSidebarProps {
  abaAtiva: string
  setAbaAtiva: (aba: string) => void
  criandoNovoOrcamento: boolean
  criarNovoOrcamento: () => void
}

export function AppSidebar({ abaAtiva, setAbaAtiva, criandoNovoOrcamento, criarNovoOrcamento }: AppSidebarProps) {
  const [expandido, setExpandido] = useState(() => {
    // On mobile devices, start collapsed by default
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768
    }
    return true
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    window.history.pushState({}, "", `#${abaAtiva}`)

    // Add event listener for window resize
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setExpandido(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [abaAtiva])

  // Function to handle menu item click on mobile
  const handleMenuItemClick = (aba: string) => {
    setAbaAtiva(aba)
    if (window.innerWidth < 768) {
      setIsMobileMenuOpen(false)
    }
  }

  return (
    <>
      {/* Mobile menu button - only visible on small screens */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded-md shadow-md"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div
        className={`h-full ${expandido ? "w-64" : "w-20"} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out relative
                   md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} 
                   fixed md:static z-40 top-0 left-0`}
      >
        <button
          onClick={() => setExpandido(!expandido)}
          className="absolute -right-4 top-20 bg-white border border-gray-200 rounded-full p-2 shadow-md z-10 hover:bg-gray-50 hidden md:block"
          aria-label={expandido ? "Recolher menu" : "Expandir menu"}
        >
          {expandido ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>

        <div className="h-12 border-b border-gray-200 flex items-center px-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-md">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 2L4 5v14.5c0 .83.67 1.5 1.5 1.5h13c.83 0 1.5-.67 1.5-1.5V5l-8-3z"
                  fill="white"
                  stroke="white"
                  strokeWidth="1.5"
                />
                <path
                  d="M12 6.5c-1.93 0-3.5 1.57-3.5 3.5v1.5h7v-1.5c0-1.93-1.57-3.5-3.5-3.5z"
                  fill="#0f4c81"
                  stroke="#0f4c81"
                  strokeWidth="0.5"
                />
                <path
                  d="M12 14.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"
                  fill="#0f4c81"
                  stroke="#0f4c81"
                  strokeWidth="0.5"
                />
              </svg>
            </div>
            {expandido && (
              <div>
                <h1 className="text-base font-bold text-primary tracking-tight">ONEBASE</h1>
                <p className="text-xs text-gray-500">Uniformes Industriais</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-4">
            {expandido ? (
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Orçamentos</h2>
            ) : (
              <div className="flex justify-center mb-2">
                <FileText className="h-4 w-4 text-gray-500" />
              </div>
            )}
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={`w-full h-8 ${expandido ? "justify-start text-xs" : "justify-center"}`}
                onClick={() => {
                  criarNovoOrcamento()
                  handleMenuItemClick("orcamento")
                }}
              >
                <Plus className={`${expandido ? "mr-2" : ""} h-4 w-4`} />
                {expandido && <span>Novo Orçamento</span>}
              </Button>

              <button
                onClick={() => handleMenuItemClick("orcamento")}
                className={`w-full flex items-center ${expandido ? "px-2" : "justify-center px-1"} py-2 text-xs rounded-md transition-colors ${
                  abaAtiva === "orcamento" ? "bg-primary text-white font-medium" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <FileText className={`h-4 w-4 ${expandido ? "mr-2" : ""}`} />
                {expandido && <span>Edição Orçamento</span>}
              </button>

              <button
                onClick={() => handleMenuItemClick("orcamentos")}
                className={`w-full flex items-center ${expandido ? "px-2" : "justify-center px-1"} py-2 text-xs rounded-md transition-colors ${
                  abaAtiva === "orcamentos" ? "bg-primary text-white font-medium" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Save className={`h-4 w-4 ${expandido ? "mr-2" : ""}`} />
                {expandido && <span>Orçamentos Salvos</span>}
              </button>

              <button
                onClick={() => handleMenuItemClick("produtos-tabela")}
                className={`w-full flex items-center ${expandido ? "px-2" : "justify-center px-1"} py-2 text-xs rounded-md transition-colors ${
                  abaAtiva === "produtos-tabela"
                    ? "bg-primary text-white font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Table className={`h-4 w-4 ${expandido ? "mr-2" : ""}`} />
                {expandido && <span>Tabela de Produtos</span>}
              </button>
            </div>
          </div>

          <div>
            {expandido ? (
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cadastros</h2>
            ) : (
              <div className="flex justify-center mb-2">
                <Users className="h-4 w-4 text-gray-500" />
              </div>
            )}
            <div className="space-y-1">
              <button
                onClick={() => handleMenuItemClick("clientes")}
                className={`w-full flex items-center ${expandido ? "px-2" : "justify-center px-1"} py-2 text-xs rounded-md transition-colors ${
                  abaAtiva === "clientes" ? "bg-primary text-white font-medium" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Users className={`h-4 w-4 ${expandido ? "mr-2" : ""}`} />
                {expandido && <span>Clientes</span>}
              </button>

              <button
                onClick={() => handleMenuItemClick("produtos")}
                className={`w-full flex items-center ${expandido ? "px-2" : "justify-center px-1"} py-2 text-xs rounded-md transition-colors ${
                  abaAtiva === "produtos" ? "bg-primary text-white font-medium" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <ShoppingBag className={`h-4 w-4 ${expandido ? "mr-2" : ""}`} />
                {expandido && <span>Produtos</span>}
              </button>

              <button
                onClick={() => handleMenuItemClick("materiais")}
                className={`w-full flex items-center ${expandido ? "px-2" : "justify-center px-1"} py-2 text-xs rounded-md transition-colors ${
                  abaAtiva === "materiais" ? "bg-primary text-white font-medium" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Palette className={`h-4 w-4 ${expandido ? "mr-2" : ""}`} />
                {expandido && <span>Materiais</span>}
              </button>

              <button
                onClick={() => handleMenuItemClick("lixeira")}
                className={`w-full flex items-center ${expandido ? "px-2" : "justify-center px-1"} py-2 text-xs rounded-md transition-colors ${
                  abaAtiva === "lixeira" ? "bg-red-500 text-white font-medium" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Trash2 className={`h-4 w-4 ${expandido ? "mr-2" : ""}`} />
                {expandido && <span>Lixeira</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </>
  )
}

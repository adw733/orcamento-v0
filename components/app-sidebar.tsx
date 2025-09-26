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
  Building2,
  Settings,
  Moon,
  Sun,
  Monitor,
  Search,
  Ruler,
  ThumbsDown,
  CheckCircle2,
  Truck,
  CircleDollarSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"

interface AppSidebarProps {
  abaAtiva: string
  setAbaAtiva: (aba: string) => void
  criandoNovoOrcamento: boolean
  criarNovoOrcamento: () => void
}

export function AppSidebar({ abaAtiva, setAbaAtiva, criandoNovoOrcamento, criarNovoOrcamento }: AppSidebarProps) {
  const { theme, setTheme } = useTheme()
  const [expandido, setExpandido] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024
    }
    return true
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    window.history.pushState({}, "", `#${abaAtiva}`)

    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setExpandido(false)
      } else {
        setExpandido(true)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [abaAtiva])

  const handleMenuItemClick = (aba: string) => {
    setAbaAtiva(aba)
    if (window.innerWidth < 1024) {
      setIsMobileMenuOpen(false)
    }
  }

  const menuSections = [
    {
      title: "Orçamentos",
      icon: FileText,
      items: [
        { id: "orcamento", label: "Edição Orçamento", icon: FileText },
        { id: "orcamentos", label: "Todos Orçamentos", icon: Save },
        { id: "orcamentos-finalizados", label: "1 - Finalizados", icon: CheckCircle2 },
        { id: "orcamentos-entregues", label: "2 - Entregues", icon: Truck },
        { id: "orcamentos-cobranca", label: "3 - Cobrança", icon: CircleDollarSign },
        { id: "orcamentos-execucao", label: "4 - Em Execução", icon: Ruler },
        { id: "orcamentos-propostas", label: "5 - Propostas", icon: Search },
        { id: "orcamentos-recusados", label: "6 - Recusados", icon: ThumbsDown },
        { id: "produtos-tabela", label: "Tabela de Produtos", icon: Table },
      ]
    },
    {
      title: "Cadastros",
      icon: Users,
      items: [
        { id: "clientes", label: "Clientes", icon: Users },
        { id: "produtos", label: "Produtos", icon: ShoppingBag },
        { id: "materiais", label: "Materiais", icon: Palette },
        { id: "empresa", label: "Empresa", icon: Building2 },
      ]
    },
    {
      title: "Sistema",
      icon: Settings,
      items: [
        { id: "lixeira", label: "Lixeira", icon: Trash2, variant: "destructive" as const },
      ]
    }
  ]

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 shadow-md bg-background"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      <div
        className={`h-full ${expandido ? "w-72" : "w-20"} bg-background border-r border-border flex flex-col transition-all duration-300 ease-in-out relative
                   lg:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} 
                   fixed lg:static z-40 top-0 left-0 shadow-lg lg:shadow-none`}
      >
        {/* Collapse/Expand button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setExpandido(!expandido)}
          className="absolute -right-4 top-20 shadow-md z-10 hidden lg:flex"
          aria-label={expandido ? "Recolher menu" : "Expandir menu"}
        >
          {expandido ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        {/* Header */}
        <div className="h-16 border-b border-border flex items-center px-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg shadow-sm">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            {expandido && (
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-foreground tracking-tight">ONEBASE</h1>
                <p className="text-xs text-muted-foreground">Sistema de Orçamentos</p>
              </div>
            )}
          </div>
          {expandido && (
            <div className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Monitor className="mr-2 h-4 w-4" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Quick Action */}
        <div className="p-4 border-b border-border">
          <Button
            onClick={() => {
              criarNovoOrcamento()
              handleMenuItemClick("orcamento")
            }}
            className={`w-full ${expandido ? "justify-start" : "justify-center px-0"}`}
            size={expandido ? "default" : "icon"}
          >
            <Plus className={`h-4 w-4 ${expandido ? "mr-2" : ""}`} />
            {expandido && "Novo Orçamento"}
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-6">
            {menuSections.map((section) => (
              <div key={section.title}>
                {expandido ? (
                  <div className="flex items-center gap-2 mb-3">
                    <section.icon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                ) : (
                  <div className="flex justify-center mb-3">
                    <section.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const IconComponent = item.icon
                    const isActive = abaAtiva === item.id
                    const isDestructive = item.variant === "destructive"
                    
                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleMenuItemClick(item.id)}
                        className={`w-full ${expandido ? "justify-start" : "justify-center px-0"} ${
                          isDestructive && !isActive ? "text-destructive hover:text-destructive hover:bg-destructive/10" : ""
                        } ${isActive && isDestructive ? "bg-destructive hover:bg-destructive" : ""}`}
                      >
                        <IconComponent className={`h-4 w-4 ${expandido ? "mr-3" : ""}`} />
                        {expandido && <span className="truncate">{item.label}</span>}
                      </Button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}
    </>
  )
}
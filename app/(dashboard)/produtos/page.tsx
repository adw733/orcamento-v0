"use client"

import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import GerenciadorProdutos from "@/components/gerenciador-produtos"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { mockProdutos } from "@/lib/mock-data"
import type { Produto } from "@/types/types"

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])

  useEffect(() => {
    carregarProdutos()
  }, [])

  const carregarProdutos = async () => {
    try {
      const { data: produtosData, error: produtosError } = await supabase.from("produtos").select("*").order("nome")

      if (produtosError) {
        console.warn("Erro ao carregar produtos do Supabase, usando dados mock:", produtosError)
        if (produtos.length === 0) {
          setProdutos(mockProdutos)
        }
      } else if (produtosData && produtosData.length > 0) {
        const { data: coresGlobais } = await supabase.from("cores").select("nome")
        const { data: tecidosGlobais } = await supabase.from("tecidos_base").select("nome, composicao")

        const coresArray = coresGlobais ? coresGlobais.map((c) => c.nome) : []
        const tecidosArray = tecidosGlobais
          ? tecidosGlobais.map((t) => ({ nome: t.nome, composicao: t.composicao || "" }))
          : []

        const produtosCompletos = produtosData.map((produto) => ({
          id: produto.id,
          codigo: produto.codigo || `P${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
          nome: produto.nome,
          valorBase: Number(produto.valor_base),
          tecidos: tecidosArray,
          cores: coresArray,
          tamanhosDisponiveis: produto.tamanhos_disponiveis || [],
          categoria: produto.categoria || "Outros",
        } as Produto))

        setProdutos(produtosCompletos)
      } else if (produtos.length === 0) {
        setProdutos(mockProdutos)
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error)
      if (produtos.length === 0) {
        setProdutos(mockProdutos)
      }
    }
  }

  const adicionarProduto = async (produto: Produto) => {
    const { data, error } = await supabase
      .from("produtos")
      .insert({
        id: produto.id,
        codigo: produto.codigo,
        nome: produto.nome,
        valor_base: produto.valorBase,
        tamanhos_disponiveis: produto.tamanhosDisponiveis,
        categoria: produto.categoria,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  }

  return (
    <>
      <PageHeader
        title="Gerenciador de Produtos"
        subtitle="Gerencie seus produtos"
      />
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-3 md:p-4">
          <GerenciadorProdutos
            produtos={produtos}
            adicionarProduto={adicionarProduto}
            setProdutos={setProdutos}
          />
        </CardContent>
      </Card>
    </>
  )
}

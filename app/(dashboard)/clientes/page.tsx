"use client"

import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import GerenciadorClientes from "@/components/gerenciador-clientes"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { mockClientes } from "@/lib/mock-data"
import type { Cliente } from "@/types/types"

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])

  useEffect(() => {
    carregarClientes()
  }, [])

  const carregarClientes = async () => {
    try {
      const { data: clientesData, error: clientesError } = await supabase.from("clientes").select("*").order("nome")

      if (clientesError) {
        console.warn("Erro ao carregar clientes do Supabase, usando dados mock:", clientesError)
        if (clientes.length === 0) {
          setClientes(mockClientes)
        }
      } else if (clientesData && clientesData.length > 0) {
        const clientesFormatados: Cliente[] = clientesData.map((cliente) => ({
          id: cliente.id,
          codigo: cliente.codigo || "",
          nome: cliente.nome,
          cnpj: cliente.cnpj || "",
          endereco: cliente.endereco || "",
          telefone: cliente.telefone || "",
          email: cliente.email || "",
          contato: cliente.contato || "",
        }))

        setClientes(clientesFormatados)
      } else if (clientes.length === 0) {
        setClientes(mockClientes)
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
      if (clientes.length === 0) {
        setClientes(mockClientes)
      }
    }
  }

  const adicionarCliente = async (cliente: Cliente) => {
    const { data, error } = await supabase
      .from("clientes")
      .insert({
        id: cliente.id,
        codigo: cliente.codigo,
        nome: cliente.nome,
        cnpj: cliente.cnpj,
        endereco: cliente.endereco,
        telefone: cliente.telefone,
        email: cliente.email,
        contato: cliente.contato,
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
        title="Gerenciador de Clientes"
        subtitle="Gerencie seus clientes"
      />
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-3 md:p-4">
          <GerenciadorClientes
            clientes={clientes}
            adicionarCliente={adicionarCliente}
            setClientes={setClientes}
          />
        </CardContent>
      </Card>
    </>
  )
}

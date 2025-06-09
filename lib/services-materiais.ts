import { supabase } from "@/lib/supabase"

// Interfaces para cores e tecidos
export interface Cor {
  id: string
  nome: string
  codigo_hex?: string
}

export interface TecidoBase {
  id: string
  nome: string
  composicao: string
}

export interface TipoTamanho {
  id: string
  nome: string
  descricao: string
  tamanhos: string[]
}

// Serviço para gerenciar cores
export const corService = {
  async listarTodas(): Promise<Cor[]> {
    const { data, error } = await supabase.from("cores").select("*").order("nome")

    if (error) {
      console.error("Erro ao listar cores:", error)
      throw error
    }

    return data.map((cor) => ({
      id: cor.id,
      nome: cor.nome,
      codigo_hex: cor.codigo_hex,
    }))
  },

  async adicionar(cor: Omit<Cor, "id">): Promise<Cor> {
    const { data, error } = await supabase
      .from("cores")
      .insert({
        nome: cor.nome.toUpperCase(),
        codigo_hex: cor.codigo_hex,
      })
      .select()

    if (error) {
      console.error("Erro ao adicionar cor:", error)
      throw error
    }

    return {
      id: data[0].id,
      nome: data[0].nome,
      codigo_hex: data[0].codigo_hex,
    }
  },

  async atualizar(cor: Cor): Promise<void> {
    const { error } = await supabase
      .from("cores")
      .update({
        nome: cor.nome.toUpperCase(),
        codigo_hex: cor.codigo_hex,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cor.id)

    if (error) {
      console.error("Erro ao atualizar cor:", error)
      throw error
    }
  },

  async remover(id: string): Promise<void> {
    const { error } = await supabase.from("cores").delete().eq("id", id)

    if (error) {
      console.error("Erro ao remover cor:", error)
      throw error
    }
  },
}

// Serviço para gerenciar tecidos base
export const tecidoBaseService = {
  async listarTodos(): Promise<TecidoBase[]> {
    const { data, error } = await supabase.from("tecidos_base").select("*").order("nome")

    if (error) {
      console.error("Erro ao listar tecidos base:", error)
      throw error
    }

    return data.map((tecido) => ({
      id: tecido.id,
      nome: tecido.nome,
      composicao: tecido.composicao || "",
    }))
  },

  async adicionar(tecido: Omit<TecidoBase, "id">): Promise<TecidoBase> {
    const { data, error } = await supabase
      .from("tecidos_base")
      .insert({
        nome: tecido.nome.toUpperCase(),
        composicao: tecido.composicao.toUpperCase(),
      })
      .select()

    if (error) {
      console.error("Erro ao adicionar tecido base:", error)
      throw error
    }

    return {
      id: data[0].id,
      nome: data[0].nome,
      composicao: data[0].composicao || "",
    }
  },

  async atualizar(tecido: TecidoBase): Promise<void> {
    const { error } = await supabase
      .from("tecidos_base")
      .update({
        nome: tecido.nome.toUpperCase(),
        composicao: tecido.composicao.toUpperCase(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", tecido.id)

    if (error) {
      console.error("Erro ao atualizar tecido base:", error)
      throw error
    }
  },

  async remover(id: string): Promise<void> {
    const { error } = await supabase.from("tecidos_base").delete().eq("id", id)

    if (error) {
      console.error("Erro ao remover tecido base:", error)
      throw error
    }
  },
}

// Serviço para gerenciar tipos de tamanho
export const tipoTamanhoService = {
  async listarTodos(): Promise<TipoTamanho[]> {
    try {
      const { data, error } = await supabase.from("tipos_tamanho").select("*").order("nome")

      if (error) {
        // Se a tabela não existir, retornar tipos padrão
        if (error.message.includes("does not exist")) {
          console.warn("Tabela tipos_tamanho não existe. Retornando tipos padrão.")
          return [
            {
              id: "padrao",
              nome: "PADRÃO",
              descricao: "PP, P, M, G, GG, G1, G2, G3, G4, G5, G6, G7",
              tamanhos: ["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]
            },
            {
              id: "numerico",
              nome: "NUMÉRICO",
              descricao: "36 AO 58 - NÚMEROS PARES",
              tamanhos: ["36", "38", "40", "42", "44", "46", "48", "50", "52", "54", "56", "58"]
            },
            {
              id: "infantil",
              nome: "INFANTIL",
              descricao: "0 AO 13 - TAMANHOS INFANTIS",
              tamanhos: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"]
            }
          ]
        }
        console.error("Erro ao listar tipos de tamanho:", error)
        throw error
      }

      return data.map((tipo) => ({
        id: tipo.id,
        nome: tipo.nome,
        descricao: tipo.descricao || "",
        tamanhos: tipo.tamanhos || [],
      }))
    } catch (error) {
      console.error("Erro ao listar tipos de tamanho:", error)
      // Em caso de erro, retornar array vazio para não quebrar a aplicação
      return []
    }
  },

  async adicionar(tipo: Omit<TipoTamanho, "id">): Promise<TipoTamanho> {
    try {
      const { data, error } = await supabase
        .from("tipos_tamanho")
        .insert({
          nome: tipo.nome.toUpperCase(),
          descricao: tipo.descricao.toUpperCase(),
          tamanhos: tipo.tamanhos,
        })
        .select()

      if (error) {
        if (error.message.includes("does not exist")) {
          throw new Error("Tabela tipos_tamanho não existe. Por favor, crie a tabela no banco de dados.")
        }
        console.error("Erro ao adicionar tipo de tamanho:", error)
        throw error
      }

      return {
        id: data[0].id,
        nome: data[0].nome,
        descricao: data[0].descricao || "",
        tamanhos: data[0].tamanhos || [],
      }
    } catch (error) {
      console.error("Erro ao adicionar tipo de tamanho:", error)
      throw error
    }
  },

  async atualizar(tipo: TipoTamanho): Promise<void> {
    try {
      const { error } = await supabase
        .from("tipos_tamanho")
        .update({
          nome: tipo.nome.toUpperCase(),
          descricao: tipo.descricao.toUpperCase(),
          tamanhos: tipo.tamanhos,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tipo.id)

      if (error) {
        if (error.message.includes("does not exist")) {
          throw new Error("Tabela tipos_tamanho não existe. Por favor, crie a tabela no banco de dados.")
        }
        console.error("Erro ao atualizar tipo de tamanho:", error)
        throw error
      }
    } catch (error) {
      console.error("Erro ao atualizar tipo de tamanho:", error)
      throw error
    }
  },

  async remover(id: string): Promise<void> {
    try {
      const { error } = await supabase.from("tipos_tamanho").delete().eq("id", id)

      if (error) {
        if (error.message.includes("does not exist")) {
          throw new Error("Tabela tipos_tamanho não existe. Por favor, crie a tabela no banco de dados.")
        }
        console.error("Erro ao remover tipo de tamanho:", error)
        throw error
      }
    } catch (error) {
      console.error("Erro ao remover tipo de tamanho:", error)
      throw error
    }
  },
}

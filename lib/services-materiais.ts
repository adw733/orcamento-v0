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

// Tipos padrão para fallback quando a tabela não existe
const TIPOS_PADRAO: TipoTamanho[] = [
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

// Armazenamento local em memória para tipos customizados
let tiposCustomizados: TipoTamanho[] = []
let tabelaExiste: boolean | null = null

// Serviço para gerenciar tipos de tamanho
export const tipoTamanhoService = {
  async verificarTabelaExiste(): Promise<boolean> {
    if (tabelaExiste !== null) {
      return tabelaExiste
    }

    try {
      const { error } = await supabase.from("tipos_tamanho").select("id").limit(1)
      tabelaExiste = !error
      return tabelaExiste
    } catch (error) {
      tabelaExiste = false
      return false
    }
  },

  async listarTodos(): Promise<TipoTamanho[]> {
    try {
      const tabelaExisteResult = await this.verificarTabelaExiste()
      
      if (!tabelaExisteResult) {
        console.warn("Tabela tipos_tamanho não existe. Usando tipos padrão + customizados.")
        return [...TIPOS_PADRAO, ...tiposCustomizados]
      }

      const { data, error } = await supabase.from("tipos_tamanho").select("*").order("nome")

      if (error) {
        console.error("Erro ao listar tipos de tamanho:", error)
        return [...TIPOS_PADRAO, ...tiposCustomizados]
      }

      const tiposBanco = data.map((tipo) => ({
        id: tipo.id,
        nome: tipo.nome,
        descricao: tipo.descricao || "",
        tamanhos: tipo.tamanhos || [],
      }))

      return [...TIPOS_PADRAO, ...tiposBanco, ...tiposCustomizados]
    } catch (error) {
      console.error("Erro ao listar tipos de tamanho:", error)
      return [...TIPOS_PADRAO, ...tiposCustomizados]
    }
  },

  async adicionar(tipo: Omit<TipoTamanho, "id">): Promise<TipoTamanho> {
    try {
      const tabelaExisteResult = await this.verificarTabelaExiste()
      
      if (!tabelaExisteResult) {
        // Se a tabela não existe, adicionar aos tipos customizados em memória
        const novoTipo: TipoTamanho = {
          id: `custom_${Date.now()}`,
          nome: tipo.nome.toUpperCase(),
          descricao: tipo.descricao.toUpperCase(),
          tamanhos: tipo.tamanhos,
        }
        
        tiposCustomizados.push(novoTipo)
        console.warn("Tabela tipos_tamanho não existe. Tipo adicionado em memória:", novoTipo.nome)
        return novoTipo
      }

      const { data, error } = await supabase
        .from("tipos_tamanho")
        .insert({
          nome: tipo.nome.toUpperCase(),
          descricao: tipo.descricao.toUpperCase(),
          tamanhos: tipo.tamanhos,
        })
        .select()

      if (error) {
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
      // Se é um tipo customizado em memória
      if (tipo.id.startsWith('custom_')) {
        const index = tiposCustomizados.findIndex(t => t.id === tipo.id)
        if (index !== -1) {
          tiposCustomizados[index] = {
            ...tipo,
            nome: tipo.nome.toUpperCase(),
            descricao: tipo.descricao.toUpperCase(),
          }
          console.warn("Tipo customizado atualizado em memória:", tipo.nome)
          return
        }
      }

      // Se é um tipo padrão, não permitir edição
      if (['padrao', 'numerico', 'infantil'].includes(tipo.id)) {
        throw new Error("Não é possível editar tipos padrão do sistema.")
      }

      const tabelaExisteResult = await this.verificarTabelaExiste()
      
      if (!tabelaExisteResult) {
        throw new Error("Tabela tipos_tamanho não existe. Não é possível atualizar tipos salvos no banco.")
      }

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
      // Se é um tipo customizado em memória
      if (id.startsWith('custom_')) {
        tiposCustomizados = tiposCustomizados.filter(t => t.id !== id)
        console.warn("Tipo customizado removido da memória")
        return
      }

      // Se é um tipo padrão, não permitir remoção
      if (['padrao', 'numerico', 'infantil'].includes(id)) {
        throw new Error("Não é possível remover tipos padrão do sistema.")
      }

      const tabelaExisteResult = await this.verificarTabelaExiste()
      
      if (!tabelaExisteResult) {
        throw new Error("Tabela tipos_tamanho não existe. Não é possível remover tipos salvos no banco.")
      }

      const { error } = await supabase.from("tipos_tamanho").delete().eq("id", id)

      if (error) {
        console.error("Erro ao remover tipo de tamanho:", error)
        throw error
      }
    } catch (error) {
      console.error("Erro ao remover tipo de tamanho:", error)
      throw error
    }
  },
}

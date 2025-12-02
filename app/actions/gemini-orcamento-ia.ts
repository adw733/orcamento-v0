"use server"

import { GoogleGenAI } from "@google/genai"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { writeFile, mkdir } from "node:fs/promises"
import path from "node:path"

// Cliente admin com Service Role Key para bypass de RLS
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada')
  }
  
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Obter tenant_id do usuário atual
async function getTenantId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user?.app_metadata?.tenant_id) {
    throw new Error('Usuário não tem tenant_id configurado')
  }
  
  return user.app_metadata.tenant_id
}

interface ClienteDB {
  id: string
  codigo: string
  nome: string
  cnpj?: string
  endereco?: string
  telefone?: string
  email?: string
}

interface ProdutoDB {
  id: string
  codigo: string
  nome: string
  valor_base: number
  cores: string[]
  tamanhos_disponiveis: string[]
}

interface TecidoDB {
  id: string
  nome: string
  composicao?: string
  produto_id?: string
}

interface ItemOrcamentoIA {
  produto: string
  produtoId?: string
  quantidade: number
  valorUnitario: number
  tecido?: string
  cor?: string
  tamanhos: Record<string, number>
  estampas?: Array<{
    posicao: string
    tipo: string
    largura: number
  }>
}

interface OrcamentoIA {
  cliente: string
  clienteId?: string
  contato?: string
  itens: ItemOrcamentoIA[]
  observacoes?: string
  condicoesPagamento?: string
  prazoEntrega?: string
  validadeOrcamento?: string
}

interface ContextoSistema {
  clientes: ClienteDB[]
  produtos: ProdutoDB[]
  tecidos: TecidoDB[]
  cores: Array<{ id: string; nome: string; codigo_hex?: string }>
}

async function getGeminiApiKey(): Promise<string> {
  const envApiKey = process.env.GEMINI_API_KEY
  if (envApiKey) return envApiKey
  
  const supabase = await createClient()
  const { data } = await supabase
    .from("configuracoes")
    .select("valor")
    .eq("chave", "gemini_api_key")
    .single()
  
  if (!data?.valor) {
    throw new Error("API key não configurada. Configure GEMINI_API_KEY no .env.local")
  }
  return data.valor
}

async function getGeminiClient(): Promise<GoogleGenAI> {
  const apiKey = await getGeminiApiKey()
  return new GoogleGenAI({ apiKey })
}

function calcularSimilaridade(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  if (s1 === s2) return 1.0
  if (s1.includes(s2) || s2.includes(s1)) return 0.8
  
  const words1 = s1.split(/\s+/)
  const words2 = s2.split(/\s+/)
  
  let matches = 0
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matches++
        break
      }
    }
  }
  
  return matches / Math.max(words1.length, words2.length)
}

function buscarClienteSimilar(nome: string, clientes: ClienteDB[]): ClienteDB | null {
  let melhorMatch: ClienteDB | null = null
  let melhorScore = 0.5
  
  for (const cliente of clientes) {
    const score = calcularSimilaridade(nome, cliente.nome)
    if (score > melhorScore) {
      melhorScore = score
      melhorMatch = cliente
    }
  }
  
  return melhorMatch
}

function buscarProdutoSimilar(nome: string, produtos: ProdutoDB[]): ProdutoDB | null {
  let melhorMatch: ProdutoDB | null = null
  let melhorScore = 0.4
  
  for (const produto of produtos) {
    const score = calcularSimilaridade(nome, produto.nome)
    if (score > melhorScore) {
      melhorScore = score
      melhorMatch = produto
    }
  }
  
  return melhorMatch
}

async function obterProximoCodigo(tabela: string, prefixo: string = ""): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from(tabela)
    .select("codigo")
    .order("created_at", { ascending: false })
    .limit(1)
  
  if (data && data.length > 0) {
    const ultimoCodigo = data[0].codigo.replace(prefixo, "")
    const numero = parseInt(ultimoCodigo, 10)
    if (!isNaN(numero)) {
      return prefixo + (numero + 1).toString().padStart(4, "0")
    }
  }
  
  return prefixo + "0001"
}

async function criarCliente(dados: Partial<ClienteDB>, tenantId: string): Promise<ClienteDB> {
  const supabase = getAdminClient()
  const codigo = await obterProximoCodigo("clientes")
  
  const novoCliente = {
    id: crypto.randomUUID(),
    codigo,
    nome: dados.nome || "Cliente Novo",
    cnpj: dados.cnpj || null,
    endereco: dados.endereco || null,
    telefone: dados.telefone || null,
    email: dados.email || null,
    tenant_id: tenantId,
  }
  
  const { error } = await supabase.from("clientes").insert(novoCliente)
  if (error) throw new Error(`Erro ao criar cliente: ${error.message}`)
  
  return novoCliente as ClienteDB
}

async function criarProduto(dados: {
  nome: string
  valorBase?: number
  cores?: string[]
  tamanhos?: string[]
  tecido?: string
}, tenantId: string): Promise<ProdutoDB> {
  const supabase = getAdminClient()
  const codigo = await obterProximoCodigo("produtos")
  
  const novoProduto = {
    id: crypto.randomUUID(),
    codigo,
    nome: dados.nome,
    valor_base: dados.valorBase || 50.0,
    cores: dados.cores || ["BRANCO", "PRETO"],
    tamanhos_disponiveis: dados.tamanhos || ["P", "M", "G", "GG"],
    tenant_id: tenantId,
  }
  
  const { error: produtoError } = await supabase.from("produtos").insert(novoProduto)
  if (produtoError) throw new Error(`Erro ao criar produto: ${produtoError.message}`)
  
  if (dados.tecido) {
    await supabase.from("tecidos").insert({
      id: crypto.randomUUID(),
      nome: dados.tecido,
      composicao: "Composição padrão",
      produto_id: novoProduto.id,
      tenant_id: tenantId,
    })
  }
  
  return novoProduto as ProdutoDB
}

async function criarOrcamento(
  orcamento: OrcamentoIA,
  clienteId: string,
  itensProcessados: Array<{
    produtoId: string
    produto: ProdutoDB
    quantidade: number
    valorUnitario: number
    tecido?: string
    cor?: string
    tamanhos: Record<string, number>
    estampas?: Array<{ posicao: string; tipo: string; largura: number }>
  }>,
  tenantId: string,
  imagemUrl?: string
): Promise<any> {
  const supabase = getAdminClient()
  
  const { data: ultimoOrc } = await supabase
    .from("orcamentos")
    .select("numero")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
  
  let proximoNumero = "0001"
  if (ultimoOrc && ultimoOrc.length > 0) {
    const numStr = ultimoOrc[0].numero.split(" - ")[0]
    const num = parseInt(numStr, 10)
    if (!isNaN(num)) {
      proximoNumero = (num + 1).toString().padStart(4, "0")
    }
  }
  
  const { data: clienteData } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", clienteId)
    .single()
  
  const primeiroItem = itensProcessados[0]
  const numeroCompleto = `${proximoNumero} - ${primeiroItem.produto.nome} - ${clienteData?.nome || orcamento.cliente} - ${orcamento.contato || ""}`
  
  const novoOrcamento = {
    id: crypto.randomUUID(),
    numero: numeroCompleto,
    data: new Date().toISOString().split("T")[0],
    cliente_id: clienteId,
    observacoes: orcamento.observacoes || "",
    condicoes_pagamento: orcamento.condicoesPagamento || "30 dias",
    prazo_entrega: orcamento.prazoEntrega || "45 dias",
    validade_orcamento: orcamento.validadeOrcamento || "15 dias",
    status: "5 - Proposta",
    tenant_id: tenantId,
  }
  
  const { error: orcError } = await supabase.from("orcamentos").insert(novoOrcamento)
  if (orcError) throw new Error(`Erro ao criar orçamento: ${orcError.message}`)
  
  for (let index = 0; index < itensProcessados.length; index++) {
    const item = itensProcessados[index]
    const itemId = crypto.randomUUID()
    
    const { error: itemError } = await supabase.from("itens_orcamento").insert({
      id: itemId,
      orcamento_id: novoOrcamento.id,
      produto_id: item.produtoId,
      quantidade: item.quantidade,
      valor_unitario: item.valorUnitario,
      tecido_nome: item.tecido,
      cor_selecionada: item.cor,
      tamanhos: item.tamanhos,
      posicao: index + 1,
    })
    
    if (itemError) throw new Error(`Erro ao criar item: ${itemError.message}`)
    
    if (item.estampas && item.estampas.length > 0) {
      for (const estampa of item.estampas) {
        await supabase.from("estampas").insert({
          id: crypto.randomUUID(),
          item_orcamento_id: itemId,
          posicao: estampa.posicao,
          tipo: estampa.tipo,
          largura: estampa.largura || 8,
        })
      }
    }
  }
  
  return {
    ...novoOrcamento,
    cliente: clienteData,
    itens: itensProcessados,
    imagemUrl,
  }
}

async function carregarContextoSistema(): Promise<ContextoSistema> {
  const supabase = await createClient()
  
  const [clientesRes, produtosRes, tecidosRes, coresRes] = await Promise.all([
    supabase.from("clientes").select("id, codigo, nome, cnpj, endereco, telefone, email").order("nome"),
    supabase.from("produtos").select("id, codigo, nome, valor_base, cores, tamanhos_disponiveis").order("nome"),
    supabase.from("tecidos_base").select("id, nome, composicao"),
    supabase.from("cores").select("id, nome, codigo_hex"),
  ])
  
  return {
    clientes: clientesRes.data || [],
    produtos: produtosRes.data || [],
    tecidos: tecidosRes.data || [],
    cores: coresRes.data || [],
  }
}

async function gerarImagemOrcamento(
  descricaoOrcamento: string,
  itens: Array<{ produto: string; cor?: string; quantidade: number }>
): Promise<string | null> {
  try {
    const ai = await getGeminiClient()
    
    const itensDescricao = itens.map(i => 
      `${i.quantidade}x ${i.produto}${i.cor ? ` na cor ${i.cor}` : ""}`
    ).join(", ")
    
    const promptImagem = `Crie uma imagem profissional e elegante de uniformes industriais para um orçamento comercial. 
    Os itens são: ${itensDescricao}. 
    Estilo: fotografia de catálogo profissional, fundo branco ou cinza claro, uniformes bem apresentados, 
    qualidade comercial, iluminação de estúdio. Não inclua pessoas, apenas os uniformes dispostos de forma elegante.`
    
    console.log("🎨 Gerando imagem com Gemini...")
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: promptImagem,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    })
    
    const candidate = response.candidates?.[0]
    if (!candidate?.content?.parts) {
      console.log("⚠️ Sem partes na resposta")
      return null
    }
    
    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        console.log("✅ Imagem encontrada na resposta!")
        
        const publicDir = path.join(process.cwd(), "public", "orcamentos-imagens")
        await mkdir(publicDir, { recursive: true })
        
        const nomeArquivo = `orcamento-${Date.now()}.png`
        const caminhoCompleto = path.join(publicDir, nomeArquivo)
        
        const buffer = Buffer.from(part.inlineData.data, "base64")
        await writeFile(caminhoCompleto, buffer)
        
        console.log(`✅ Imagem salva: ${caminhoCompleto}`)
        return `/orcamentos-imagens/${nomeArquivo}`
      }
    }
    
    console.log("⚠️ Nenhuma imagem na resposta do Gemini")
    return null
    
  } catch (error) {
    console.error("❌ Erro ao gerar imagem:", error)
    return null
  }
}

const SYSTEM_PROMPT = `Você é um assistente especializado em criar orçamentos de uniformes industriais.
Sua função é transformar QUALQUER texto em linguagem natural (WhatsApp, email, anotações) em um orçamento estruturado.

## REGRAS FUNDAMENTAIS:

1. **SEMPRE CRIE O ORÇAMENTO** - Mesmo com informações incompletas, crie o orçamento preenchendo dados faltantes com valores padrão sensatos.

2. **BUSQUE SIMILARIDADES** - Se o usuário mencionar "polo", busque produtos como "CAMISA POLO". Se mencionar "Polimix", busque "POLIMIX CONCRETO LTDA".

3. **INVENTE DADOS FALTANTES** - Se não souber:
   - Quantidade: use 1
   - Tamanhos: distribua igualmente entre M e G
   - Valor: use o valor base do produto ou R$ 50,00
   - Cor: use BRANCO
   - Tecido: use MALHA PIQUET
   - Estampas: se mencionado "logo" ou "bordado", crie estampa no PEITO ESQUERDO

4. **FORMATO DE RESPOSTA** - Responda SEMPRE em JSON válido:

{
  "orcamento": {
    "cliente": "NOME DO CLIENTE",
    "contato": "NOME DO CONTATO",
    "itens": [
      {
        "produto": "NOME DO PRODUTO",
        "quantidade": 10,
        "valorUnitario": 45.90,
        "tecido": "MALHA PIQUET",
        "cor": "BRANCO",
        "tamanhos": {"P": 2, "M": 4, "G": 3, "GG": 1},
        "estampas": [
          {"posicao": "PEITO ESQUERDO", "tipo": "BORDADO", "largura": 8}
        ]
      }
    ],
    "observacoes": "",
    "condicoesPagamento": "30 dias",
    "prazoEntrega": "45 dias"
  },
  "mensagem": "Orçamento criado com sucesso!"
}

NUNCA peça mais informações. SEMPRE crie o orçamento com o que tem disponível.`

export async function processarMensagemIA(
  mensagem: string,
  historico: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<{
  success: boolean
  resposta: string
  orcamentoCriado?: any
  entidadesCriadas?: {
    cliente?: ClienteDB
    produtos?: ProdutoDB[]
  }
  imagemGerada?: string
  pendencias?: string[]
}> {
  try {
    const ai = await getGeminiClient()
    const contexto = await carregarContextoSistema()
    
    const clientesLista = contexto.clientes.length > 0
      ? contexto.clientes.map(c => `- ${c.nome} (${c.codigo})`).join("\n")
      : "Nenhum cliente cadastrado"
    
    const produtosLista = contexto.produtos.length > 0
      ? contexto.produtos.map(p => `- ${p.nome} (${p.codigo}) - R$ ${p.valor_base?.toFixed(2) || "50.00"}`).join("\n")
      : "Nenhum produto cadastrado"
    
    const tecidosLista = contexto.tecidos.length > 0
      ? contexto.tecidos.map(t => `- ${t.nome}`).join(", ")
      : "MALHA PIQUET, BRIM, OXFORD"
    
    const promptCompleto = `${SYSTEM_PROMPT}

## DADOS DO SISTEMA:

### CLIENTES CADASTRADOS:
${clientesLista}

### PRODUTOS CADASTRADOS:
${produtosLista}

### TECIDOS DISPONÍVEIS:
${tecidosLista}

---

MENSAGEM DO USUÁRIO:
${mensagem}

Responda APENAS com o JSON, sem markdown, sem explicações adicionais.`

    console.log("🤖 Processando com Gemini 3 Pro Preview...")
    
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: promptCompleto,
    })
    
    const responseText = response.text || ""
    console.log("Resposta Gemini:", responseText)
    
    let jsonResponse: any
    try {
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText
      jsonResponse = JSON.parse(jsonStr.trim())
    } catch (parseError) {
      console.error("Erro ao parsear JSON:", parseError)
      return {
        success: false,
        resposta: "Desculpe, não consegui processar sua solicitação. Pode reformular?",
      }
    }
    
    if (jsonResponse.orcamento) {
      const orcamento = jsonResponse.orcamento as OrcamentoIA
      const entidadesCriadas: { cliente?: ClienteDB; produtos?: ProdutoDB[] } = {}
      
      // Obter tenant_id do usuário atual
      const tenantId = await getTenantId()
      
      let clienteId: string
      const clienteExistente = buscarClienteSimilar(orcamento.cliente, contexto.clientes)
      
      if (clienteExistente) {
        clienteId = clienteExistente.id
      } else {
        const novoCliente = await criarCliente({
          nome: orcamento.cliente,
        }, tenantId)
        clienteId = novoCliente.id
        entidadesCriadas.cliente = novoCliente
      }
      
      const itensProcessados: Array<{
        produtoId: string
        produto: ProdutoDB
        quantidade: number
        valorUnitario: number
        tecido?: string
        cor?: string
        tamanhos: Record<string, number>
        estampas?: Array<{ posicao: string; tipo: string; largura: number }>
      }> = []
      
      entidadesCriadas.produtos = []
      
      for (const item of orcamento.itens) {
        let produto = buscarProdutoSimilar(item.produto, contexto.produtos)
        
        if (!produto) {
          produto = await criarProduto({
            nome: item.produto.toUpperCase(),
            valorBase: item.valorUnitario,
            cores: item.cor ? [item.cor] : undefined,
            tecido: item.tecido,
          }, tenantId)
          entidadesCriadas.produtos.push(produto)
          contexto.produtos.push(produto)
        }
        
        let tamanhos = item.tamanhos || {}
        if (Object.keys(tamanhos).length === 0) {
          const tamanhosDisp = produto.tamanhos_disponiveis || ["M", "G"]
          const qtdPorTam = Math.floor(item.quantidade / tamanhosDisp.length)
          const resto = item.quantidade % tamanhosDisp.length
          
          tamanhos = {}
          tamanhosDisp.forEach((tam, idx) => {
            tamanhos[tam] = qtdPorTam + (idx < resto ? 1 : 0)
          })
        }
        
        itensProcessados.push({
          produtoId: produto.id,
          produto,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario || produto.valor_base || 50,
          tecido: item.tecido,
          cor: item.cor || (produto.cores?.[0]),
          tamanhos,
          estampas: item.estampas,
        })
      }
      
      // Geração de imagem desabilitada temporariamente (quota Gemini excedida)
      // Para reativar, descomente o bloco abaixo quando tiver quota disponível
      let imagemUrl: string | null = null
      /*
      console.log("🎨 Tentando gerar imagem do orçamento...")
      try {
        imagemUrl = await gerarImagemOrcamento(
          `Orçamento para ${orcamento.cliente}`,
          itensProcessados.map(i => ({
            produto: i.produto.nome,
            cor: i.cor,
            quantidade: i.quantidade,
          }))
        )
      } catch (imgError) {
        console.log("⚠️ Não foi possível gerar imagem:", imgError)
      }
      */
      
      const orcamentoCriado = await criarOrcamento(orcamento, clienteId, itensProcessados, tenantId, imagemUrl || undefined)
      
      const valorTotal = itensProcessados.reduce(
        (acc, item) => acc + (item.quantidade * item.valorUnitario),
        0
      )
      
      let resposta = `✅ **Orçamento ${orcamentoCriado.numero} criado com sucesso!**\n\n`
      resposta += `**Cliente:** ${orcamento.cliente}${orcamento.contato ? ` (${orcamento.contato})` : ""}\n`
      resposta += `**Itens:**\n`
      
      for (const item of itensProcessados) {
        resposta += `- ${item.quantidade}x ${item.produto.nome}`
        if (item.cor) resposta += ` - ${item.cor}`
        resposta += ` - R$ ${item.valorUnitario.toFixed(2)}\n`
      }
      
      resposta += `\n**Valor Total:** R$ ${valorTotal.toFixed(2)}\n`
      resposta += `**Prazo:** ${orcamento.prazoEntrega || "45 dias"}\n`
      resposta += `**Pagamento:** ${orcamento.condicoesPagamento || "30 dias"}\n`
      
      if (imagemUrl) {
        resposta += `\n🖼️ *Imagem do orçamento gerada automaticamente!*`
      }
      
      if (entidadesCriadas.cliente) {
        resposta += `\n📝 *Cliente "${entidadesCriadas.cliente.nome}" foi criado automaticamente.*`
      }
      
      if (entidadesCriadas.produtos && entidadesCriadas.produtos.length > 0) {
        resposta += `\n📝 *${entidadesCriadas.produtos.length} produto(s) criado(s) automaticamente.*`
      }
      
      return {
        success: true,
        resposta,
        orcamentoCriado,
        entidadesCriadas: Object.keys(entidadesCriadas).length > 0 ? entidadesCriadas : undefined,
        imagemGerada: imagemUrl || undefined,
      }
    }
    
    return {
      success: true,
      resposta: jsonResponse.mensagem || "Não entendi sua solicitação. Pode descrever o orçamento que precisa?",
    }
    
  } catch (error) {
    console.error("Erro ao processar mensagem:", error)
    return {
      success: false,
      resposta: `Erro ao processar: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    }
  }
}

export async function listarOrcamentosRecentes(limite: number = 5): Promise<any[]> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from("orcamentos")
    .select(`
      id,
      numero,
      data,
      status,
      clientes (nome)
    `)
    .order("created_at", { ascending: false })
    .limit(limite)
  
  return data || []
}

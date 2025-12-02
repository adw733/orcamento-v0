"use server"

import { GoogleGenAI } from "@google/genai"
import { createClient } from "@/lib/supabase/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

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

interface OrcamentoContexto {
  numero: string
  cliente?: {
    nome: string
    cnpj?: string
    endereco?: string
    telefone?: string
    email?: string
  }
  itens: Array<{
    id: string
    produto?: { nome: string; id: string }
    quantidade: number
    valorUnitario: number
    corSelecionada?: string
    tamanhos?: Record<string, number>
    estampas?: Array<{ posicao: string; tipo: string; largura: number; altura?: number }>
  }>
  observacoes?: string
  condicoesPagamento?: string
  prazoEntrega?: string
  validadeOrcamento?: string
  valorFrete?: number
  valorDesconto?: number
  nomeContato?: string
  telefoneContato?: string
}

interface ComandoEdicao {
  tipo: "alterar_quantidade" | "alterar_valor" | "alterar_tamanhos" | "adicionar_item" | "remover_item" | 
        "alterar_cliente" | "alterar_observacoes" | "alterar_frete" | "alterar_desconto" | 
        "alterar_prazo" | "alterar_pagamento" | "alterar_cor" | "adicionar_estampa" | "remover_estampa" |
        "alterar_contato" | "resposta_texto" | "gerar_imagem"
  itemIndex?: number
  itemId?: string
  novoValor?: any
  mensagem?: string
  imagemUrl?: string
}

interface RespostaEdicao {
  success: boolean
  comandos: ComandoEdicao[]
  mensagemUsuario: string
}

const SYSTEM_PROMPT = `Você é um assistente especializado em editar orçamentos de uniformes industriais.
Seu papel é interpretar comandos em linguagem natural e retornar instruções estruturadas para modificar o orçamento.

## CONTEXTO DO ORÇAMENTO ATUAL:
{CONTEXTO_ORCAMENTO}

## REGRAS:

1. **INTERPRETE COMANDOS DE EDIÇÃO** - O usuário pode pedir para:
   - Alterar quantidade de um item: "muda a quantidade da camiseta para 50"
   - Alterar valor unitário: "coloca o valor da jaqueta em 150 reais"
   - Alterar tamanhos: "distribui 10 P, 20 M e 20 G na camiseta"
   - Adicionar/remover itens: "adiciona 5 calças operacionais"
   - Alterar dados do cliente: "muda o contato para João"
   - Alterar frete/desconto: "coloca frete de 100 reais"
   - Alterar observações: "adiciona nas observações: entrega urgente"
   - Alterar prazos: "muda prazo de entrega para 30 dias"
   - Alterar estampas: "adiciona bordado nas costas da camiseta"

2. **IDENTIFIQUE O ITEM CORRETO** - Use o nome do produto ou posição para identificar qual item modificar.

3. **RESPONDA SEMPRE EM JSON** com o formato:
{
  "comandos": [
    {
      "tipo": "alterar_quantidade",
      "itemIndex": 0,
      "novoValor": 50
    }
  ],
  "mensagemUsuario": "Quantidade da camiseta alterada para 50 unidades."
}

## TIPOS DE COMANDOS DISPONÍVEIS:
- alterar_quantidade: { itemIndex, novoValor: number }
- alterar_valor: { itemIndex, novoValor: number }
- alterar_tamanhos: { itemIndex, novoValor: { P: 10, M: 20, G: 20 } }
- alterar_cor: { itemIndex, novoValor: "AZUL MARINHO" }
- adicionar_estampa: { itemIndex, novoValor: { posicao: "COSTAS", tipo: "BORDADO", largura: 20, altura: 10 } }
- remover_estampa: { itemIndex, novoValor: { posicao: "PEITO ESQUERDO" } }
- adicionar_item: { novoValor: { nome: "CALÇA BRIM", quantidade: 60, valorUnitario: 54.90, tamanhos: { M: 40, G: 20 }, estampas: [] } }
- alterar_frete: { novoValor: 100 }
- alterar_desconto: { novoValor: 50 }
- alterar_observacoes: { novoValor: "texto das observações" }
- alterar_prazo: { novoValor: "30 dias" }
- alterar_pagamento: { novoValor: "50% entrada, 50% na entrega" }
- alterar_contato: { novoValor: { nome: "João", telefone: "11999999999" } }
- gerar_imagem: { itemIndex, novoValor: "descrição detalhada do uniforme para gerar imagem" }
- resposta_texto: { mensagem: "resposta para perguntas" }

6. **GERAÇÃO DE IMAGEM** - Quando o usuário pedir para gerar/criar uma imagem de um item:
   - Use o comando "gerar_imagem" com itemIndex do item
   - Em novoValor, coloque uma descrição detalhada do uniforme baseada nas informações do item
   - Exemplo: "gera imagem da camiseta", "cria uma foto da jaqueta"

4. **SE NÃO ENTENDER** - Peça esclarecimento de forma educada.

5. **SEJA CONCISO** - Confirme a ação realizada de forma breve.`

export async function processarComandoEdicao(
  mensagem: string,
  orcamentoContexto: OrcamentoContexto,
  historicoMensagens?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<RespostaEdicao> {
  try {
    const ai = await getGeminiClient()
    
    // Formatar contexto do orçamento
    const contextoFormatado = `
Número: ${orcamentoContexto.numero}
Cliente: ${orcamentoContexto.cliente?.nome || "Não definido"}
Contato: ${orcamentoContexto.nomeContato || "Não definido"} - ${orcamentoContexto.telefoneContato || ""}

Itens:
${orcamentoContexto.itens.map((item, idx) => `
  ${idx + 1}. ${item.produto?.nome || "Produto não definido"}
     - Quantidade: ${item.quantidade}
     - Valor Unitário: R$ ${item.valorUnitario?.toFixed(2) || "0.00"}
     - Cor: ${item.corSelecionada || "Não definida"}
     - Tamanhos: ${item.tamanhos ? Object.entries(item.tamanhos).map(([t, q]) => `${t}: ${q}`).join(", ") : "Não definidos"}
     - Estampas: ${item.estampas?.map(e => `${e.posicao} (${e.tipo})`).join(", ") || "Nenhuma"}
`).join("")}

Frete: R$ ${orcamentoContexto.valorFrete?.toFixed(2) || "0.00"}
Desconto: R$ ${orcamentoContexto.valorDesconto?.toFixed(2) || "0.00"}
Observações: ${orcamentoContexto.observacoes || "Nenhuma"}
Prazo de Entrega: ${orcamentoContexto.prazoEntrega || "Não definido"}
Condições de Pagamento: ${orcamentoContexto.condicoesPagamento || "Não definido"}
`
    
    const promptCompleto = SYSTEM_PROMPT.replace("{CONTEXTO_ORCAMENTO}", contextoFormatado)
    
    console.log("🤖 Processando comando de edição com Gemini 3 Pro Preview...")
    
    // Construir histórico de conversa para contexto
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [
      { role: "user", parts: [{ text: promptCompleto }] },
      { role: "model", parts: [{ text: "Entendido! Estou pronto para ajudar a editar o orçamento. Envie seu comando." }] }
    ]
    
    // Adicionar histórico de mensagens anteriores para manter contexto
    if (historicoMensagens && historicoMensagens.length > 0) {
      // Limitar a últimas 10 mensagens para não exceder limite de tokens
      const ultimasMensagens = historicoMensagens.slice(-10)
      for (const msg of ultimasMensagens) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        })
      }
    }
    
    // Adicionar mensagem atual
    contents.push({ role: "user", parts: [{ text: mensagem }] })
    
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents,
    })
    
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || ""
    console.log("Resposta Gemini:", responseText)
    
    // Parsear resposta JSON
    let jsonResponse: { comandos: ComandoEdicao[]; mensagemUsuario: string }
    try {
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText
      jsonResponse = JSON.parse(jsonStr.trim())
    } catch (parseError) {
      // Se não conseguir parsear, retorna como resposta de texto
      return {
        success: true,
        comandos: [{ tipo: "resposta_texto", mensagem: responseText }],
        mensagemUsuario: responseText
      }
    }
    
    return {
      success: true,
      comandos: jsonResponse.comandos || [],
      mensagemUsuario: jsonResponse.mensagemUsuario || "Comando processado."
    }
    
  } catch (error) {
    console.error("Erro ao processar comando:", error)
    return {
      success: false,
      comandos: [],
      mensagemUsuario: `Erro ao processar: ${error instanceof Error ? error.message : "Erro desconhecido"}`
    }
  }
}

// Função para gerar imagem de uniforme usando Gemini 3 Pro Image Preview
export async function gerarImagemUniforme(
  descricao: string,
  itemInfo: {
    produto: string
    cor?: string
    tecido?: string
    estampas?: Array<{ posicao: string; tipo: string }>
  }
): Promise<{ success: boolean; imagemUrl?: string; mensagem: string }> {
  try {
    const ai = await getGeminiClient()
    
    // Construir prompt detalhado para geração de imagem
    const estampasDesc = itemInfo.estampas?.length 
      ? `Com ${itemInfo.estampas.map(e => `${e.tipo.toLowerCase()} na posição ${e.posicao.toLowerCase()}`).join(" e ")}.`
      : ""
    
    const promptImagem = `Crie uma imagem fotorrealista de alta qualidade de um uniforme industrial profissional.

Produto: ${itemInfo.produto}
${itemInfo.cor ? `Cor: ${itemInfo.cor}` : ""}
${itemInfo.tecido ? `Tecido: ${itemInfo.tecido}` : ""}
${estampasDesc}

Descrição adicional: ${descricao}

Estilo da imagem:
- Fotografia de catálogo profissional
- Fundo branco ou cinza claro neutro
- Iluminação de estúdio suave e uniforme
- Uniforme bem apresentado, sem pessoas vestindo
- Qualidade comercial para orçamento
- Ângulo frontal mostrando detalhes do produto
- Alta resolução e nitidez`

    console.log("🎨 Gerando imagem com Gemini 3 Pro Image Preview...")
    console.log("Prompt:", promptImagem)
    
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: promptImagem,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    })
    
    const candidate = response.candidates?.[0]
    if (!candidate?.content?.parts) {
      console.log("⚠️ Sem partes na resposta")
      return { success: false, mensagem: "Não foi possível gerar a imagem. Tente novamente." }
    }
    
    // Procurar por imagem na resposta
    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        console.log("✅ Imagem encontrada na resposta!")
        
        // Criar diretório se não existir
        const publicDir = path.join(process.cwd(), "public", "orcamentos-imagens")
        await mkdir(publicDir, { recursive: true })
        
        // Salvar imagem
        const nomeArquivo = `uniforme-${Date.now()}.png`
        const caminhoCompleto = path.join(publicDir, nomeArquivo)
        
        const buffer = Buffer.from(part.inlineData.data, "base64")
        await writeFile(caminhoCompleto, buffer)
        
        const imagemUrl = `/orcamentos-imagens/${nomeArquivo}`
        console.log(`✅ Imagem salva: ${imagemUrl}`)
        
        return { 
          success: true, 
          imagemUrl,
          mensagem: `Imagem do ${itemInfo.produto} gerada com sucesso!`
        }
      }
    }
    
    // Se não encontrou imagem, verificar se há texto de erro
    const textoResposta = candidate.content.parts.find(p => p.text)?.text
    console.log("⚠️ Nenhuma imagem na resposta. Texto:", textoResposta)
    
    return { 
      success: false, 
      mensagem: textoResposta || "Não foi possível gerar a imagem. O modelo não retornou uma imagem válida."
    }
    
  } catch (error) {
    console.error("❌ Erro ao gerar imagem:", error)
    return { 
      success: false, 
      mensagem: `Erro ao gerar imagem: ${error instanceof Error ? error.message : "Erro desconhecido"}`
    }
  }
}

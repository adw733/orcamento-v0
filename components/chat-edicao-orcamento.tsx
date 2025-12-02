"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { 
  Loader2, 
  Send, 
  Bot, 
  User, 
  Sparkles,
  MessageSquare,
  X
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { processarComandoEdicao, gerarImagemUniforme } from "@/app/actions/gemini-edicao-orcamento"
import { cn } from "@/lib/utils"
import { useDataCache } from "@/lib/data-cache"
import type { Orcamento } from "@/types/types"

interface Mensagem {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  imagemUrl?: string
}

interface ChatEdicaoOrcamentoProps {
  orcamento: Orcamento
  setOrcamento: React.Dispatch<React.SetStateAction<Orcamento>>
}

export default function ChatEdicaoOrcamento({ 
  orcamento,
  setOrcamento
}: ChatEdicaoOrcamentoProps) {
  const { produtos } = useDataCache()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [input, setInput] = useState("")
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      id: "welcome",
      role: "system",
      content: `👋 **Olá!** Sou seu assistente de edição.

Diga o que deseja alterar no orçamento:
- "Muda a quantidade para 50"
- "Coloca o valor em R$ 45"
- "Adiciona bordado nas costas"
- "Muda o frete para R$ 100"

🎨 **Gerar imagens:**
- "Gera imagem da camiseta"
- "Cria uma foto da jaqueta"

Estou pronto para ajudar!`,
      timestamp: new Date(),
    }
  ])
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensagens])
  
  // Focar no input quando abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])
  
  const aplicarComando = (comando: any) => {
    setOrcamento(prev => {
      const novoOrcamento = { ...prev }
      
      switch (comando.tipo) {
        case "alterar_quantidade":
          if (comando.itemIndex !== undefined && novoOrcamento.itens[comando.itemIndex]) {
            novoOrcamento.itens = [...novoOrcamento.itens]
            novoOrcamento.itens[comando.itemIndex] = {
              ...novoOrcamento.itens[comando.itemIndex],
              quantidade: comando.novoValor
            }
            // Recalcular tamanhos proporcionalmente
            const item = novoOrcamento.itens[comando.itemIndex]
            if (item.tamanhos) {
              const totalAtual = Object.values(item.tamanhos).reduce((a, b) => a + b, 0)
              if (totalAtual > 0) {
                const fator = comando.novoValor / totalAtual
                const novosTamanhos: Record<string, number> = {}
                let soma = 0
                const entries = Object.entries(item.tamanhos)
                entries.forEach(([tam, qtd], idx) => {
                  if (idx === entries.length - 1) {
                    novosTamanhos[tam] = comando.novoValor - soma
                  } else {
                    novosTamanhos[tam] = Math.round(qtd * fator)
                    soma += novosTamanhos[tam]
                  }
                })
                novoOrcamento.itens[comando.itemIndex].tamanhos = novosTamanhos
              }
            }
          }
          break
          
        case "alterar_valor":
          if (comando.itemIndex !== undefined && novoOrcamento.itens[comando.itemIndex]) {
            novoOrcamento.itens = [...novoOrcamento.itens]
            novoOrcamento.itens[comando.itemIndex] = {
              ...novoOrcamento.itens[comando.itemIndex],
              valorUnitario: comando.novoValor
            }
          }
          break
          
        case "alterar_tamanhos":
          if (comando.itemIndex !== undefined && novoOrcamento.itens[comando.itemIndex]) {
            novoOrcamento.itens = [...novoOrcamento.itens]
            novoOrcamento.itens[comando.itemIndex] = {
              ...novoOrcamento.itens[comando.itemIndex],
              tamanhos: comando.novoValor,
              quantidade: Object.values(comando.novoValor as Record<string, number>).reduce((a, b) => a + b, 0)
            }
          }
          break
          
        case "alterar_cor":
          if (comando.itemIndex !== undefined && novoOrcamento.itens[comando.itemIndex]) {
            novoOrcamento.itens = [...novoOrcamento.itens]
            novoOrcamento.itens[comando.itemIndex] = {
              ...novoOrcamento.itens[comando.itemIndex],
              corSelecionada: comando.novoValor
            }
          }
          break
          
        case "adicionar_item":
          if (comando.novoValor) {
            // Buscar produto existente pelo nome ou usar tecidos/cores do primeiro produto disponível
            const produtoExistente = produtos.find(p => 
              p.nome.toLowerCase().includes((comando.novoValor.nome || "").toLowerCase())
            )
            const produtoBase = produtoExistente || produtos[0]
            
            const novoItem = {
              id: crypto.randomUUID(),
              produtoId: produtoExistente?.id || "",
              produto: {
                id: produtoExistente?.id || crypto.randomUUID(),
                codigo: produtoExistente?.codigo || "",
                nome: comando.novoValor.nome || "Novo Item",
                valorBase: comando.novoValor.valorUnitario || produtoExistente?.valorBase || 0,
                tecidos: produtoBase?.tecidos || [],
                cores: produtoBase?.cores || [],
                tamanhosDisponiveis: produtoBase?.tamanhosDisponiveis || Object.keys(comando.novoValor.tamanhos || {})
              },
              quantidade: comando.novoValor.quantidade || (Object.values(comando.novoValor.tamanhos || {}) as number[]).reduce((a, b) => a + b, 0),
              valorUnitario: comando.novoValor.valorUnitario || 0,
              tamanhos: comando.novoValor.tamanhos || {},
              estampas: comando.novoValor.estampas || [],
              observacaoComercial: "",
              observacaoTecnica: "",
              tecidoSelecionado: produtoBase?.tecidos?.[0],
              corSelecionada: produtoBase?.cores?.[0] || ""
            }
            novoOrcamento.itens = [...novoOrcamento.itens, novoItem]
          }
          break
          
        case "adicionar_estampa":
          if (comando.itemIndex !== undefined && novoOrcamento.itens[comando.itemIndex]) {
            novoOrcamento.itens = [...novoOrcamento.itens]
            const item = novoOrcamento.itens[comando.itemIndex]
            // Mapear altura para comprimento (o tipo Estampa usa comprimento, não altura)
            // Adicionar id único para evitar erro de key no React
            const novaEstampa = {
              id: crypto.randomUUID(),
              posicao: comando.novoValor.posicao,
              tipo: comando.novoValor.tipo,
              largura: comando.novoValor.largura,
              comprimento: comando.novoValor.altura || comando.novoValor.comprimento
            }
            novoOrcamento.itens[comando.itemIndex] = {
              ...item,
              estampas: [...(item.estampas || []), novaEstampa]
            }
          }
          break
          
        case "remover_estampa":
          if (comando.itemIndex !== undefined && novoOrcamento.itens[comando.itemIndex]) {
            novoOrcamento.itens = [...novoOrcamento.itens]
            const item = novoOrcamento.itens[comando.itemIndex]
            novoOrcamento.itens[comando.itemIndex] = {
              ...item,
              estampas: (item.estampas || []).filter(e => e.posicao !== comando.novoValor.posicao)
            }
          }
          break
          
        case "alterar_frete":
          novoOrcamento.valorFrete = comando.novoValor
          break
          
        case "alterar_desconto":
          novoOrcamento.valorDesconto = comando.novoValor
          break
          
        case "alterar_observacoes":
          novoOrcamento.observacoes = comando.novoValor
          break
          
        case "alterar_prazo":
          novoOrcamento.prazoEntrega = comando.novoValor
          break
          
        case "alterar_pagamento":
          novoOrcamento.condicoesPagamento = comando.novoValor
          break
          
        case "alterar_contato":
          if (comando.novoValor.nome) novoOrcamento.nomeContato = comando.novoValor.nome
          if (comando.novoValor.telefone) novoOrcamento.telefoneContato = comando.novoValor.telefone
          break
          
        case "gerar_imagem":
          // A imagem é aplicada via imagemUrl no comando
          if (comando.itemIndex !== undefined && novoOrcamento.itens[comando.itemIndex] && comando.imagemUrl) {
            novoOrcamento.itens = [...novoOrcamento.itens]
            novoOrcamento.itens[comando.itemIndex] = {
              ...novoOrcamento.itens[comando.itemIndex],
              imagem: comando.imagemUrl
            }
          }
          break
      }
      
      return novoOrcamento
    })
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    const userMessage: Mensagem = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }
    
    setMensagens(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    
    try {
      // Preparar contexto do orçamento
      const contexto = {
        numero: orcamento.numero || "Novo",
        cliente: orcamento.cliente ? {
          nome: orcamento.cliente.nome,
          cnpj: orcamento.cliente.cnpj,
          endereco: orcamento.cliente.endereco,
          telefone: orcamento.cliente.telefone,
          email: orcamento.cliente.email,
        } : undefined,
        itens: orcamento.itens.map(item => ({
          id: item.id,
          produto: item.produto ? { nome: item.produto.nome, id: item.produto.id } : undefined,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          corSelecionada: item.corSelecionada,
          tamanhos: item.tamanhos,
          estampas: item.estampas?.map(e => ({
            posicao: e.posicao || "",
            tipo: e.tipo || "",
            largura: e.largura || 0,
            altura: (e as any).altura
          })),
        })),
        observacoes: orcamento.observacoes,
        condicoesPagamento: orcamento.condicoesPagamento,
        prazoEntrega: orcamento.prazoEntrega,
        validadeOrcamento: orcamento.validadeOrcamento,
        valorFrete: orcamento.valorFrete,
        valorDesconto: orcamento.valorDesconto,
        nomeContato: orcamento.nomeContato,
        telefoneContato: orcamento.telefoneContato,
      }
      
      // Preparar histórico de mensagens (excluindo system messages)
      const historico = mensagens
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role as "user" | "assistant", content: m.content }))
      
      const resultado = await processarComandoEdicao(userMessage.content, contexto, historico)
      
      // Aplicar comandos
      if (resultado.success && resultado.comandos.length > 0) {
        for (const comando of resultado.comandos) {
          // Tratamento especial para geração de imagem
          if (comando.tipo === "gerar_imagem" && comando.itemIndex !== undefined) {
            const item = orcamento.itens[comando.itemIndex]
            if (item) {
              // Adicionar mensagem de "gerando imagem"
              const gerandoMessage: Mensagem = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: `🎨 Gerando imagem do ${item.produto?.nome || "item"}...`,
                timestamp: new Date(),
              }
              setMensagens(prev => [...prev, gerandoMessage])
              
              // Chamar função de geração de imagem
              const resultadoImagem = await gerarImagemUniforme(
                comando.novoValor || "",
                {
                  produto: item.produto?.nome || "Uniforme",
                  cor: item.corSelecionada,
                  tecido: item.tecidoSelecionado?.nome,
                  estampas: item.estampas?.map(e => ({ posicao: e.posicao || "", tipo: e.tipo || "" }))
                }
              )
              
              if (resultadoImagem.success && resultadoImagem.imagemUrl) {
                // Aplicar imagem ao item
                aplicarComando({ ...comando, imagemUrl: resultadoImagem.imagemUrl })
                
                // Adicionar mensagem com a imagem
                const imagemMessage: Mensagem = {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: `✅ ${resultadoImagem.mensagem}`,
                  timestamp: new Date(),
                  imagemUrl: resultadoImagem.imagemUrl
                }
                setMensagens(prev => [...prev, imagemMessage])
              } else {
                // Mensagem de erro
                const erroMessage: Mensagem = {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: `❌ ${resultadoImagem.mensagem}`,
                  timestamp: new Date(),
                }
                setMensagens(prev => [...prev, erroMessage])
              }
            }
          } else if (comando.tipo !== "resposta_texto") {
            aplicarComando(comando)
          }
        }
        
        // Só adiciona mensagem final se não foi geração de imagem
        const temGeracaoImagem = resultado.comandos.some(c => c.tipo === "gerar_imagem")
        if (!temGeracaoImagem) {
          const assistantMessage: Mensagem = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: resultado.mensagemUsuario,
            timestamp: new Date(),
          }
          setMensagens(prev => [...prev, assistantMessage])
        }
      } else {
        const assistantMessage: Mensagem = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: resultado.mensagemUsuario,
          timestamp: new Date(),
        }
        setMensagens(prev => [...prev, assistantMessage])
      }
      
    } catch (error) {
      const errorMessage: Mensagem = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `❌ Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        timestamp: new Date(),
      }
      setMensagens(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }
  
  return (
    <>
      {/* Botão flutuante para abrir chat */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 rounded-full w-14 h-14 p-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg z-50"
          title="Assistente IA de Edição"
        >
          <Sparkles className="h-6 w-6 text-white" />
        </Button>
      )}

      {/* Janela de chat flutuante */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 w-96 z-50">
          <Card className="shadow-2xl border-0 overflow-hidden">
            {/* Header */}
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <div>
                  <div className="text-sm font-semibold">Assistente de Edição</div>
                  <div className="text-xs text-white/70">Gemini 3 Pro Preview</div>
                </div>
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            {/* Mensagens */}
            <ScrollArea className="h-80 p-3 bg-gray-50 dark:bg-gray-900" ref={scrollRef}>
              <div className="space-y-3">
                {mensagens.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role !== "user" && (
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                        msg.role === "system" ? "bg-purple-100 dark:bg-purple-900" : "bg-blue-100 dark:bg-blue-900"
                      )}>
                        {msg.role === "system" ? (
                          <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <Bot className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                    )}
                    
                    <div className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                      msg.role === "user" 
                        ? "bg-blue-600 text-white rounded-br-sm" 
                        : "bg-white dark:bg-gray-800 rounded-bl-sm shadow-sm"
                    )}>
                      <div className={cn(
                        "whitespace-pre-wrap",
                        msg.role === "user" ? "text-white" : "text-gray-800 dark:text-gray-200"
                      )}>
                        {msg.content.split("**").map((part, i) => 
                          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                        )}
                      </div>
                      {/* Exibir imagem se houver */}
                      {msg.imagemUrl && (
                        <div className="mt-2">
                          <img 
                            src={msg.imagemUrl} 
                            alt="Imagem gerada" 
                            className="rounded-lg max-w-full h-auto border border-gray-200 dark:border-gray-700"
                            style={{ maxHeight: "200px" }}
                          />
                        </div>
                      )}
                      <div className={cn(
                        "text-[10px] mt-1",
                        msg.role === "user" ? "text-white/60" : "text-gray-400"
                      )}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    {msg.role === "user" && (
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                        <User className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Bot className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-2 shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {/* Input */}
            <CardFooter className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <form onSubmit={handleSubmit} className="flex w-full gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ex: Muda quantidade para 50..."
                  disabled={isLoading}
                  className="flex-1 text-sm"
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  )
}

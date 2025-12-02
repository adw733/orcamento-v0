"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  X, 
  MessageSquare,
  FileText,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink
} from "lucide-react"
import { processarMensagemIA } from "@/app/actions/gemini-orcamento-ia"
import { cn } from "@/lib/utils"

interface Mensagem {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  orcamentoCriado?: any
  entidadesCriadas?: {
    cliente?: any
    produtos?: any[]
  }
}

interface AssistenteIAV2Props {
  onOrcamentoCriado?: (orcamento: any) => void
  onNavigate?: (aba: string) => void
}

export default function AssistenteIAV2({ 
  onOrcamentoCriado,
  onNavigate 
}: AssistenteIAV2Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [input, setInput] = useState("")
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      id: "welcome",
      role: "system",
      content: `👋 **Olá! Sou seu assistente de orçamentos.**

Cole aqui qualquer texto de WhatsApp, email ou anotação e eu transformo em um orçamento completo!

**Exemplos do que posso fazer:**
- "10 camisas polo brancas para Polimix, contato André"
- "Preciso de uniformes para 20 funcionários da obra"
- Cole uma conversa inteira do WhatsApp

**Dica:** Quanto mais detalhes, melhor! Mas mesmo com poucas informações, eu crio o orçamento e você ajusta depois.`,
      timestamp: new Date(),
    }
  ])
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensagens])
  
  // Focar no textarea quando abrir
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])
  
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
      // Preparar histórico para contexto
      const historico = mensagens
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role as "user" | "assistant", content: m.content }))
      
      const resultado = await processarMensagemIA(input.trim(), historico)
      
      const assistantMessage: Mensagem = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: resultado.resposta,
        timestamp: new Date(),
        orcamentoCriado: resultado.orcamentoCriado,
        entidadesCriadas: resultado.entidadesCriadas,
      }
      
      setMensagens(prev => [...prev, assistantMessage])
      
      // Notificar sobre orçamento criado
      if (resultado.orcamentoCriado && onOrcamentoCriado) {
        onOrcamentoCriado(resultado.orcamentoCriado)
      }
      
    } catch (error) {
      const errorMessage: Mensagem = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `❌ Erro ao processar: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
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
  
  const copiarTexto = (texto: string) => {
    navigator.clipboard.writeText(texto)
  }
  
  const abrirOrcamento = (orcamento: any) => {
    if (orcamento?.id) {
      // Redirecionar para a página de visualização do orçamento
      window.location.href = `/orcamento-otimizado?id=${orcamento.id}`
    } else if (onNavigate) {
      onNavigate("orcamento")
    }
  }
  
  // Botão flutuante quando fechado
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 z-50"
        size="icon"
      >
        <Sparkles className="h-6 w-6 text-white" />
      </Button>
    )
  }
  
  return (
    <Card className="fixed bottom-6 right-6 w-[420px] h-[600px] shadow-2xl z-50 flex flex-col border-2 border-blue-200 dark:border-blue-800">
      {/* Header */}
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Assistente de Orçamentos</CardTitle>
              <p className="text-xs text-white/80">Powered by Gemini 2.5 Flash</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      
      {/* Mensagens */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4">
            {mensagens.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role !== "user" && (
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    msg.role === "system" ? "bg-purple-100 dark:bg-purple-900" : "bg-blue-100 dark:bg-blue-900"
                  )}>
                    {msg.role === "system" ? (
                      <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3",
                  msg.role === "user" 
                    ? "bg-blue-600 text-white rounded-br-md" 
                    : "bg-gray-100 dark:bg-gray-800 rounded-bl-md"
                )}>
                  {/* Conteúdo da mensagem */}
                  <div className={cn(
                    "text-sm whitespace-pre-wrap",
                    msg.role === "user" ? "text-white" : "text-gray-800 dark:text-gray-200"
                  )}>
                    {msg.content.split("**").map((part, i) => 
                      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                    )}
                  </div>
                  
                  {/* Ações para orçamento criado */}
                  {msg.orcamentoCriado && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">
                          Orçamento criado!
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => abrirOrcamento(msg.orcamentoCriado)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Ver Orçamento
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => copiarTexto(msg.orcamentoCriado.numero)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copiar Nº
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Badges para entidades criadas */}
                  {msg.entidadesCriadas && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.entidadesCriadas.cliente && (
                        <Badge variant="secondary" className="text-xs">
                          + Cliente criado
                        </Badge>
                      )}
                      {msg.entidadesCriadas.produtos?.map((p, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          + {p.nome}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Timestamp */}
                  <div className={cn(
                    "text-[10px] mt-1 opacity-60",
                    msg.role === "user" ? "text-right" : "text-left"
                  )}>
                    {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Processando orçamento...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      
      {/* Input */}
      <CardFooter className="p-3 border-t bg-gray-50 dark:bg-gray-900">
        <form onSubmit={handleSubmit} className="flex gap-2 w-full">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cole texto do WhatsApp, email ou descreva o orçamento..."
            className="min-h-[60px] max-h-[120px] resize-none text-sm"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={isLoading || !input.trim()}
            className="h-[60px] w-[60px] bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}

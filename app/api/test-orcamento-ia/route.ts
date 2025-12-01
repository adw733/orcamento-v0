import { NextResponse } from "next/server"
import { processarMensagemIA } from "@/app/actions/gemini-orcamento-ia"

export async function POST(request: Request) {
  try {
    const { mensagem } = await request.json()
    
    if (!mensagem) {
      return NextResponse.json({ error: "Mensagem é obrigatória" }, { status: 400 })
    }
    
    console.log("🧪 Testando processarMensagemIA com:", mensagem)
    
    const resultado = await processarMensagemIA(mensagem, [])
    
    console.log("📦 Resultado:", JSON.stringify(resultado, null, 2))
    
    return NextResponse.json(resultado)
  } catch (error) {
    console.error("❌ Erro no teste:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: "ok",
    message: "Use POST com { mensagem: 'seu pedido de orçamento' }" 
  })
}

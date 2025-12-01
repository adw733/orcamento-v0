// Script de teste para a função de IA
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Carregar variáveis de ambiente do .env.local
function loadEnv() {
  try {
    const envContent = readFileSync(".env.local", "utf-8");
    const vars = {};
    envContent.split("\n").forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          vars[key.trim()] = valueParts.join("=").trim();
        }
      }
    });
    return vars;
  } catch (e) {
    console.error("Erro ao ler .env.local:", e.message);
    return {};
  }
}

const env = loadEnv();
const GEMINI_API_KEY = env.GEMINI_API_KEY;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

console.log("🔧 Configuração:");
console.log("  - GEMINI_API_KEY:", GEMINI_API_KEY ? "✅ Configurada" : "❌ Não configurada");
console.log("  - SUPABASE_URL:", SUPABASE_URL ? "✅ Configurada" : "❌ Não configurada");
console.log("  - SUPABASE_SERVICE_KEY:", SUPABASE_SERVICE_KEY ? "✅ Configurada" : "❌ Não configurada");

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY não configurada!");
  process.exit(1);
}

async function testarGemini() {
  console.log("\n🤖 Testando conexão com Gemini 2.5 Flash...");
  
  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Você é um assistente de orçamentos. Responda APENAS com JSON válido.
      
Crie um orçamento simples para: "5 camisas polo azuis para XYZ Engenharia, contato Maria Santos"

Responda no formato:
{
  "orcamento": {
    "cliente": "nome da empresa",
    "contato": "nome do contato",
    "itens": [
      {
        "produto": "nome do produto",
        "quantidade": numero,
        "cor": "cor",
        "valorUnitario": valor
      }
    ],
    "prazoEntrega": "prazo",
    "condicoesPagamento": "condições"
  }
}`,
    });
    
    const text = response.text;
    console.log("\n✅ Resposta do Gemini:");
    console.log(text);
    
    // Tentar parsear JSON
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      const parsed = JSON.parse(jsonStr.trim());
      console.log("\n✅ JSON parseado com sucesso:");
      console.log(JSON.stringify(parsed, null, 2));
      return true;
    } catch (parseError) {
      console.log("\n⚠️ Não foi possível parsear como JSON, mas a API respondeu.");
      return true;
    }
    
  } catch (error) {
    console.error("\n❌ Erro ao chamar Gemini:", error.message);
    if (error.message.includes("API key")) {
      console.log("   Verifique se a GEMINI_API_KEY está correta.");
    }
    return false;
  }
}

async function testarSupabase() {
  console.log("\n🗄️ Testando conexão com Supabase...");
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Credenciais do Supabase não configuradas!");
    return false;
  }
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Testar leitura de clientes
    const { data: clientes, error } = await supabase
      .from("clientes")
      .select("id, nome, codigo")
      .limit(3);
    
    if (error) {
      console.error("❌ Erro ao buscar clientes:", error.message);
      return false;
    }
    
    console.log("✅ Conexão com Supabase OK!");
    console.log(`   ${clientes.length} clientes encontrados:`, clientes.map(c => c.nome).join(", "));
    
    // Testar leitura de produtos
    const { data: produtos, error: prodError } = await supabase
      .from("produtos")
      .select("id, nome, codigo")
      .limit(3);
    
    if (prodError) {
      console.error("❌ Erro ao buscar produtos:", prodError.message);
      return false;
    }
    
    console.log(`   ${produtos.length} produtos encontrados:`, produtos.map(p => p.nome).join(", "));
    
    return true;
  } catch (error) {
    console.error("❌ Erro de conexão com Supabase:", error.message);
    return false;
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("   TESTE DE GERAÇÃO DE ORÇAMENTO COM IA");
  console.log("═══════════════════════════════════════════════════\n");
  
  const geminiOk = await testarGemini();
  const supabaseOk = await testarSupabase();
  
  console.log("\n═══════════════════════════════════════════════════");
  console.log("   RESULTADO DOS TESTES");
  console.log("═══════════════════════════════════════════════════");
  console.log(`   Gemini API:  ${geminiOk ? "✅ OK" : "❌ FALHOU"}`);
  console.log(`   Supabase:    ${supabaseOk ? "✅ OK" : "❌ FALHOU"}`);
  console.log("═══════════════════════════════════════════════════\n");
  
  if (geminiOk && supabaseOk) {
    console.log("🎉 Todos os testes passaram! O sistema de IA está funcionando.");
  } else {
    console.log("⚠️ Alguns testes falharam. Verifique as configurações acima.");
  }
}

main();

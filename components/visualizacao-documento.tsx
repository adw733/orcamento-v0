"use client"

import type { Orcamento, DadosEmpresa } from "@/types/types"
import { useState } from "react"

interface VisualizacaoDocumentoProps {
  orcamento: Orcamento
  calcularTotal: () => number
  dadosEmpresa?: DadosEmpresa
  modoExportacao?: "orcamento" | "ficha" | "completo" // Adicionar esta prop
}

export default function VisualizacaoDocumento({
  orcamento,
  calcularTotal,
  dadosEmpresa,
  modoExportacao = "completo", // Valor padrão é mostrar tudo
}: VisualizacaoDocumentoProps) {
  const [exportandoPDF, setExportandoPDF] = useState(false)
  // Função para formatar a data considerando o fuso horário
  const formatarDataComFusoHorario = (dataString: string): string => {
    // Adicionar o horário para evitar problemas de fuso horário
    const data = new Date(`${dataString}T12:00:00`)
    return data.toLocaleDateString("pt-BR")
  }

  // Modificar a função dataFormatada para corrigir o problema de fuso horário
  // Localizar esta linha:
  // const dataFormatada = orcamento.data ? new Date(orcamento.data).toLocaleDateString("pt-BR") : ""

  // Substituir por:
  const dataFormatada = orcamento.data ? formatarDataComFusoHorario(orcamento.data) : ""

  // Adicionar esta função auxiliar logo após a declaração de dataFormatada:

  // Definição da ordem padrão dos tamanhos
  const tamanhosPadrao = {
    // Padrão (PP ao G7)
    PP: 0,
    P: 0,
    M: 0,
    G: 0,
    GG: 0,
    G1: 0,
    G2: 0,
    G3: 0,
    G4: 0,
    G5: 0,
    G6: 0,
    G7: 0,
    // Numérico (36 ao 62) - apenas tamanhos pares
    "36": 0,
    "38": 0,
    "40": 0,
    "42": 0,
    "44": 0,
    "46": 0,
    "48": 0,
    "50": 0,
    "52": 0,
    "54": 0,
    "56": 0,
    "58": 0,
    "60": 0,
    "62": 0,
    // Infantil (0 ao 13)
    "0": 0,
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    "6": 0,
    "7": 0,
    "8": 0,
    "9": 0,
    "10": 0,
    "11": 0,
    "12": 0,
    "13": 0,
  }

  // Função para ordenar os tamanhos
  const ordenarTamanhos = (tamanhos: Record<string, number>) => {
    // Separar os tamanhos por categoria
    const tamanhosLetras: [string, number][] = []
    const tamanhosNumericos: [string, number][] = []
    const tamanhosInfantis: [string, number][] = []

    // Ordem específica para tamanhos de letras
    const ordemLetras = ["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]

    Object.entries(tamanhos)
      .filter(([_, quantidade]) => quantidade > 0)
      .forEach(([tamanho, quantidade]) => {
        // Verificar se é um tamanho de letra (PP, P, M, G, GG, G1-G7)
        if (ordemLetras.includes(tamanho)) {
          tamanhosLetras.push([tamanho, quantidade])
        }
        // Verificar se é um tamanho numérico adulto (36-62)
        else if (/^(3[6-9]|[4-5][0-9]|6[0-2])$/.test(tamanho)) {
          tamanhosNumericos.push([tamanho, quantidade])
        }
        // Verificar se é um tamanho infantil (0-13)
        else if (/^([0-9]|1[0-3])$/.test(tamanho)) {
          tamanhosInfantis.push([tamanho, quantidade])
        }
        // Outros tamanhos não categorizados
        else {
          tamanhosLetras.push([tamanho, quantidade])
        }
      })

    // Ordenar cada categoria
    tamanhosLetras.sort((a, b) => ordemLetras.indexOf(a[0]) - ordemLetras.indexOf(b[0]))
    tamanhosNumericos.sort((a, b) => Number.parseInt(a[0]) - Number.parseInt(b[0]))
    tamanhosInfantis.sort((a, b) => Number.parseInt(a[0]) - Number.parseInt(b[0]))

    // Retornar todos os tamanhos ordenados
    return [...tamanhosLetras, ...tamanhosNumericos, ...tamanhosInfantis]
  }

  // Usar os dados da empresa ou valores padrão
  const nomeEmpresa = dadosEmpresa?.nome || "ONEBASE"
  const cnpjEmpresa = dadosEmpresa?.cnpj || "12.345.678/0001-90"
  const emailEmpresa = dadosEmpresa?.email || "contato@onebase.com.br"
  const telefoneEmpresa = dadosEmpresa?.telefone || "(11) 4321-1234"
  const sloganEmpresa = dadosEmpresa?.slogan || "UNIFORMES INDUSTRIAIS"

  // Adicione estas propriedades CSS para garantir que as cores sejam preservadas na impressão
  const pdfStyles = `
  @media print {
    /* Configurações de impressão otimizadas */
    @page {
      size: A4;
      margin: 8mm;
    }
    
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    /* Tabela balanceada para impressão */
    .pdf-table {
      font-size: 0.7rem !important;
      line-height: 1.2 !important;
    }
    
    .pdf-table th, .pdf-table td {
      padding: 0.2rem 0.25rem !important;
      line-height: 1.2 !important;
      vertical-align: top !important;
      border: 1px solid #e5e7eb !important;
      overflow: visible !important;
      word-wrap: break-word !important;
    }
    
    .pdf-table th {
      height: 32px !important;
      font-size: 0.7rem !important;
      padding: 0.25rem !important;
    }
    
    .pdf-table tbody tr {
      height: auto !important;
      min-height: 45px !important; /* Altura adequada para observações na impressão */
      max-height: none !important;
      page-break-inside: avoid !important;
    }
    
    /* Observações comerciais completamente visíveis na impressão */
    .pdf-table .text-gray-600 {
      font-size: 0.6rem !important;
      line-height: 1.2 !important;
      max-height: none !important; /* Sem limitação */
      overflow: visible !important; /* Mostrar tudo */
      word-wrap: break-word !important;
      white-space: normal !important;
    }
    
    /* Nome do produto legível */
    .pdf-table .font-medium {
      font-size: 0.7rem !important;
      line-height: 1.2 !important;
      margin-bottom: 3px !important;
    }
    
    /* Tamanhos organizados */
    .pdf-table div[style*="flex"] {
      max-height: none !important;
      min-height: 18px !important;
      overflow: visible !important;
    }
    
    .pdf-table span {
      font-size: 0.6rem !important;
      margin-right: 2px !important;
      margin-bottom: 1px !important;
    }
    
    /* Seção final compacta */
    .space-y-2 > * + * {
      margin-top: 0.3rem !important;
    }
    
    /* Cards das condições compactos */
    .grid.grid-cols-3 > div {
      min-height: 35px !important;
      padding: 0.4rem !important;
    }
    
    /* Observações gerais compactas */
    .space-y-2 p {
      min-height: 20px !important;
      max-height: 35px !important;
      overflow: hidden !important;
      font-size: 0.7rem !important;
    }
    
    /* Garantir quebra de página inteligente */
    .tabela-itens-container {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    .pdf-table tbody {
      page-break-inside: auto !important;
    }
    
    /* Garantir que os gradientes e cores de fundo sejam impressos */
    .bg-gradient-to-r, .bg-primary, .bg-accent, .bg-white, .bg-white\\/10 {
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    /* Garantir que o texto branco permaneça branco */
    .text-white {
      color: white !important;
    }
    
    /* Garantir que as bordas sejam impressas */
    .border, .border-t, .border-b, .border-l, .border-r {
      border-color: inherit !important;
    }
    
    /* Controle de quebra de página */
    .page-break-inside-avoid {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    .page-break-before {
      page-break-before: always !important;
      break-before: always !important;
    }
    
    table {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    h3, h4 {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    
    /* Controle de tamanho de imagens */
    img {
      max-height: 420px; /* Reduzido em 30% de 600px */
      max-width: 70%; /* Reduzido para 70% da largura */
      object-fit: contain;
      border: 1px solid #e5e7eb !important;
      padding: 15px !important; /* Reduzido o padding */
      margin: 0 auto !important;
      display: block !important;
    }
    
    /* Garantir que as tabelas de tamanhos caibam na página */
    .tamanhos-table {
      width: 100%;
      max-width: 100%;
      font-size: 0.85rem !important;
      margin-top: 10px !important;
    }

    /* Garantir que observações caibam na página */
    .pdf-observacoes-comercial, .pdf-observacoes-tecnica {
      min-height: 30px !important;
      max-height: 60px !important;
      overflow: hidden !important;
      font-size: 0.8rem !important;
      line-height: 1.3 !important;
      padding: 8px !important;
    }

    /* Ajustar espaçamentos gerais para caber melhor na A4 */
    .pdf-section {
      padding: 8px !important;
    }

    .pdf-content {
      padding: 12px !important;
    }

    /* Reduzir espaçamento entre seções */
    .space-y-6 > * + * {
      margin-top: 12px !important;
    }

    .space-y-4 > * + * {
      margin-top: 8px !important;
    }
    
    /* Configurações para fichas técnicas */
    .ficha-tecnica {
      page-break-before: always !important;
      break-before: always !important;
    }
    
    /* Garantir que cada ficha técnica comece em uma nova página */
    .ficha-tecnica:not(:first-child) {
      margin-top: 20px;
    }

    /* Configurações para garantir que a ficha técnica caiba em uma folha A4 */
    .ficha-tecnica, .orcamento-principal {
      width: 210mm;
      box-sizing: border-box;
      padding: 0;
      margin: 0;
    }
    
    /* Remover bordas arredondadas na impressão */
    .rounded-md, .rounded-lg, .rounded-tl-md, .rounded-tr-md {
      border-radius: 0 !important;
    }
    
    /* Ajustar espaçamentos para impressão */
    .p-6 {
      padding: 1rem !important;
    }
    
    .space-y-6 > * + * {
      margin-top: 1rem !important;
    }
    
    /* Ajustar tamanho da fonte para impressão */
    .text-sm {
      font-size: 0.75rem !important;
    }
    
    /* Ajustar layout da tabela de tamanhos */
    .tamanhos-container {
      max-height: none !important;
      overflow: visible !important;
      display: flex !important;
      flex-wrap: wrap !important;
    }
    
    .tamanho-texto {
      margin-right: 8px !important;
      white-space: nowrap !important;
      font-size: 0.8rem !important;
    }

    /* Estilos para a tabela de tamanhos */
    .tamanhos-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      table-layout: auto;
    }

    .tamanhos-table th, .tamanhos-table td {
      padding: 6px 8px;
      text-align: center;
      border: 1px solid #e5e7eb;
    }

    .tamanhos-table th {
      background-color: #f3f4f6;
      font-weight: 500;
      color: #0f4c81;
    }

    .tamanhos-table th:first-child, .tamanhos-table td:first-child {
      font-weight: 600;
      background-color: #f3f4f6;
      color: #0f4c81;
      text-align: left;
      width: 60px; /* Largura fixa para a coluna "Tam." */
      min-width: 60px;
      max-width: 60px;
    }

    /* Estilo específico para a segunda linha da tabela (Qtd.) */
    .tamanhos-table tr:nth-child(2) td:first-child {
      width: 60px; /* Largura fixa para a coluna "Qtd." */
      min-width: 60px;
      max-width: 60px;
    }

    .pdf-observacoes-comercial, .pdf-observacoes-tecnica {
      min-height: 40px;
      max-height: 80px;
      overflow: hidden;
      white-space: pre-wrap;
      font-style: italic;
      font-size: 0.85em;
    }
  }
  
  /* Estilos para garantir que os elementos caibam na página A4 */
  .pdf-section {
    max-width: 100%;
    box-sizing: border-box;
    width: 100%;
    margin: 0;
    padding: 0;
  }
  
  .pdf-content {
    padding: 1rem;
    width: 100%;
  }
  
  .pdf-header {
    width: 100%;
    box-sizing: border-box;
    padding: 1rem;
    background: linear-gradient(to right, #0f4c81, #00305a);
    color: white;
  }
  
  /* Estilos para tabela com observações completas */
  .pdf-table {
    width: 100%;
    table-layout: fixed;
    font-size: 0.75rem;
    border-collapse: collapse;
    margin: 0;
    line-height: 1.2;
  }
  
  .pdf-table th, .pdf-table td {
    padding: 0.25rem;
    overflow: visible; /* Permitir expansão do conteúdo */
    text-overflow: clip;
    vertical-align: top;
    line-height: 1.2;
    border: 1px solid #e5e7eb;
    word-wrap: break-word;
  }

  .pdf-table th {
    padding: 0.3rem;
    font-size: 0.75rem;
    height: 36px;
  }

  .pdf-table tbody tr {
    height: auto !important;
    min-height: 50px !important; /* Aumentado para 50px para acomodar observações longas */
    max-height: none !important;
  }

  /* Observações comerciais sem limitação */
  .pdf-table .item-observacao {
    max-height: none !important; /* Sem limitação */
    overflow: visible !important; /* Mostrar tudo */
    font-size: 0.65rem !important;
    line-height: 1.3 !important;
    margin-top: 3px !important;
    color: #6b7280 !important;
    font-style: italic !important;
    word-wrap: break-word !important;
    white-space: normal !important;
  }

  /* Tamanhos com expansão automática */
  .pdf-table .item-tamanhos {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 3px !important;
    font-size: 0.65rem !important;
    line-height: 1.2 !important;
    max-height: none !important;
    min-height: 20px !important;
    overflow: visible !important;
  }
  
  .pdf-image {
    max-height: 550px; /* Aumentado de 350px para 550px */
    max-width: 100%;
    object-fit: contain;
  }
  
  .pdf-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }
  
  @media (max-width: 768px) {
    .pdf-grid {
      grid-template-columns: 1fr;
    }
  }
  
  .pdf-cliente-info {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    font-size: 0.85em;
  }
  
  .pdf-cliente-info p {
    margin: 0.25rem 0;
  }
  
  .pdf-observacoes {
    min-height: 40px;
    max-height: 80px;
    overflow: hidden;
  }

  .tamanhos-container {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    line-height: 1.5;
    max-height: none;
    overflow: visible;
    padding: 0.2rem;
  }
  
  .tamanho-texto {
    font-size: 0.8rem;
    color: #0369a1;
    margin-right: 8px;
    white-space: nowrap;
    padding: 1px 0;
  }

  /* Estilos para a tabela de tamanhos */
  .tamanhos-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  .tamanhos-table th, .tamanhos-table td {
    padding: 6px 8px;
    text-align: center;
    border: 1px solid #e5e7eb;
  }

  .tamanhos-table th {
    background-color: #f3f4f6;
    font-weight: 500;
    color: #0f4c81;
  }

  .tamanhos-table th:first-child, .tamanhos-table td:first-child {
    font-weight: 600;
    background-color: #f3f4f6;
    color: #0f4c81;
    text-align: left;
  }

  /* Estilos para os cards de especificações */
  .spec-card {
    font-size: 0.85rem;
    page-break-inside: avoid;
  }

  .spec-card h5 {
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    margin: 0;
    padding: 8px 12px;
  }

  .spec-card h5 svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .spec-card .spec-content {
    padding: 12px;
    background-color: white;
    min-height: 60px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }

  .spec-card .spec-content p {
    margin: 0;
    line-height: 1.4;
  }

  .spec-card .spec-content .font-medium {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 4px;
  }

  .spec-card .spec-content .text-sm {
    font-size: 0.8rem;
    color: #6b7280;
  }

  /* Estilos específicos para o card de cor */
  .spec-card .cor-container {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .spec-card .cor-circle {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid #d1d5db;
    flex-shrink: 0;
  }

  .spec-card .cor-nome {
    font-weight: 600;
    color: #1f2937;
  }

  /* Estilos específicos para o card de artes */
  .spec-card .artes-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .spec-card .arte-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #f3f4f6;
  }

  .spec-card .arte-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .spec-card .arte-numero {
    background-color: rgba(15, 76, 129, 0.1);
    color: #0f4c81;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .spec-card .arte-info {
    flex: 1;
    min-width: 0;
  }

  .spec-card .arte-posicao {
    font-weight: 600;
    color: #1f2937;
    font-size: 0.85rem;
    line-height: 1.3;
    margin-bottom: 2px;
  }

  .spec-card .arte-detalhes {
    font-size: 0.75rem;
    color: #6b7280;
    line-height: 1.2;
  }

  @media print {
    .spec-card {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    
    .spec-card h5 {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    
    .spec-card .spec-content {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
  }
`

  // Adicionar estilos específicos para controlar o tamanho das imagens
  const imageStyles = `
/* Estilos específicos para uma melhor exibição na tabela */
.pdf-image-container {
  width: 100%;
  text-align: center;
  margin: 8px 0;
  padding: 0;
}

.pdf-image-container img {
  max-width: 70%; /* Reduzido de 100% para 70% */
  max-height: 420px; /* Reduzido de 600px para 420px (30% menos) */
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
  margin: 0 auto;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 15px; /* Reduzido de 20px */
}

/* Ajustes para garantir que o conteúdo caiba em uma página A4 */
.orcamento-principal,
.ficha-tecnica {
  max-height: 277mm; /* A4 height - margins */
  overflow: hidden;
  page-break-inside: avoid;
}

/* Ajustar tamanho de fonte para caber melhor */
.pdf-section {
  font-size: 0.85rem; /* Reduzido de 0.9rem */
}

.pdf-section h1 {
  font-size: 1.2rem; /* Reduzido de 1.25rem */
}

.pdf-section h3 {
  font-size: 1rem; /* Reduzido de 1.1rem */
}

.pdf-section h4 {
  font-size: 0.95rem; /* Reduzido de 1rem */
}

/* Compactar tabelas */
.pdf-table th,
.pdf-table td {
  padding: 0.3rem; /* Reduzido de 0.4rem */
  font-size: 0.75rem; /* Reduzido de 0.8rem */
}

/* Ajustar cards de especificações */
.spec-card {
  font-size: 0.8rem; /* Reduzido de 0.85rem */
}

.spec-card h5 {
  font-size: 0.85rem; /* Reduzido de 0.9rem */
  padding: 6px 10px; /* Reduzido de 8px 12px */
}

.spec-card .spec-content {
  padding: 10px; /* Reduzido de 12px */
  min-height: 50px; /* Reduzido de 60px */
}

/* Ajustar tabela de tamanhos */
.tamanhos-table {
  font-size: 0.85rem; /* Reduzido de 0.9rem */
}

.tamanhos-table th, .tamanhos-table td {
  padding: 4px 6px; /* Reduzido de 6px 8px */
}

/* Garantir que observações não ultrapassem o espaço */
.pdf-observacoes {
  max-height: 60px;
  overflow: hidden;
  font-size: 0.8rem;
  line-height: 1.3;
}

.pdf-observacoes-comercial, .pdf-observacoes-tecnica {
  max-height: 50px;
  overflow: hidden;
  font-size: 0.75rem;
  line-height: 1.2;
  padding: 6px;
}
`

  return (
    <div className="flex flex-col gap-8 p-4 font-sans text-gray-800 pdf-container" style={{ margin: "10mm" }}>
      <style>{pdfStyles}</style>
      <style>{imageStyles}</style>

      {/* Orçamento - Renderizar apenas se for modo completo ou modo orçamento */}
      {(modoExportacao === "completo" || modoExportacao === "orcamento") && (
        <div className="border border-gray-300 rounded-md overflow-hidden shadow-sm page-break-inside-avoid pdf-section orcamento-principal">
          <div className="bg-gradient-to-r from-primary to-primary-dark p-4 pdf-header w-full">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                {dadosEmpresa?.logo_url ? (
                  <div
                    className="bg-white p-2 rounded-md shadow-md flex items-center justify-center"
                    style={{ width: "50px", height: "50px" }}
                  >
                    <img
                      src={dadosEmpresa.logo_url || "/placeholder.svg"}
                      alt={nomeEmpresa}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="bg-white p-2 rounded-md shadow-md flex items-center justify-center"
                    style={{ width: "50px", height: "50px" }}
                  >
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 2L4 5v14.5c0 .83.67 1.5 1.5 1.5h13c.83 0 1.5-.67 1.5-1.5V5l-8-3z"
                        fill="#0f4c81"
                        stroke="#0f4c81"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M12 6.5c-1.93 0-3.5 1.57-3.5 3.5v1.5h7v-1.5c0-1.93-1.57-3.5-3.5-3.5z"
                        fill="white"
                        stroke="white"
                        strokeWidth="0.5"
                      />
                      <path
                        d="M12 14.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"
                        fill="white"
                        stroke="white"
                        strokeWidth="0.5"
                      />
                    </svg>
                  </div>
                )}
                <div>
                  <div>
                    <h1 className="text-xl font-bold text-white font-sans tracking-tight uppercase">
                      ORÇAMENTO - {orcamento.numero.split(" - ")[0]}
                    </h1>
                    <p className="text-white/90 text-sm uppercase">
                      {orcamento.cliente?.nome || "EMPRESA"} -{" "}
                      {orcamento.nomeContato || orcamento.cliente?.contato || "CONTATO"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right bg-white/10 p-2 rounded-md backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white font-sans tracking-tight">{nomeEmpresa}</h2>
                <p className="text-white/80 text-xs">CNPJ: {cnpjEmpresa}</p>
                <p className="text-white/80 text-xs">{emailEmpresa}</p>
                <p className="text-white/80 text-xs">{telefoneEmpresa}</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3 pdf-content">
            <div className="border-b pb-3 page-break-inside-avoid">
              <h3 className="font-bold mb-2 text-primary text-base">DADOS DO CLIENTE</h3>
              {orcamento.cliente ? (
                <div className="pdf-cliente-info bg-accent p-2 rounded-md text-xs">{/* Reduzido de p-3 */}
                  <p>
                    <span className="font-medium">Nome:</span> {orcamento.cliente.nome}
                  </p>
                  <p>
                    <span className="font-medium">CNPJ:</span> {orcamento.cliente.cnpj}
                  </p>
                  <p>
                    <span className="font-medium">Endereço:</span> {orcamento.cliente.endereco}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span> {orcamento.cliente.email}
                  </p>
                  {orcamento.nomeContato && (
                    <p>
                      <span className="font-medium">Contato:</span> {orcamento.nomeContato}
                    </p>
                  )}
                  {orcamento.telefoneContato && (
                    <p>
                      <span className="font-medium">Telefone Contato:</span> {orcamento.telefoneContato}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">Nenhum cliente selecionado</p>
              )}
            </div>

            <div className="tabela-itens-container" style={{ marginBottom: "8px" }}>
              <div className="flex justify-between mb-2">
                <h3 className="font-bold text-base text-primary">ITENS DO ORÇAMENTO</h3>
                <p className="text-xs bg-accent px-2 py-1 rounded-full font-medium">Data: {dataFormatada}</p>
              </div>

              <table className="w-full pdf-table" style={{ tableLayout: "fixed", fontSize: "0.75rem" }}>
                <colgroup>
                  <col style={{ width: "32%" }} />
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                </colgroup>
                <thead className="bg-primary text-white">
                  <tr style={{ height: "36px" }}>
                    <th className="p-2 text-left rounded-tl-md text-xs">Item</th>
                    <th className="p-2 text-left text-xs">Tamanhos</th>
                    <th className="p-2 text-center text-xs">Qtd.</th>
                    <th className="p-2 text-right text-xs">Valor Unit.</th>
                    <th className="p-2 text-right rounded-tr-md text-xs">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orcamento.itens.length > 0 ? (
                    orcamento.itens.map((item, index) => (
                      <tr key={item.id} className="border-b" style={{ height: "auto", minHeight: "50px" }}>
                        <td className="p-2" style={{ verticalAlign: "top", width: "32%", lineHeight: "1.2" }}>
                          <div>
                            <p className="font-medium text-xs leading-tight mb-1" style={{ fontSize: "0.75rem", lineHeight: "1.2", marginBottom: "3px" }}>
                              {item.produto?.nome}
                            </p>
                            {item.observacaoComercial && (
                              <div 
                                className="text-gray-600 italic" 
                                style={{ 
                                  fontSize: "0.65rem",
                                  lineHeight: "1.3",
                                  maxHeight: "none", /* Remover limitação completamente */
                                  overflow: "visible", /* Permitir expansão total */
                                  marginTop: "2px",
                                  wordWrap: "break-word",
                                  whiteSpace: "normal"
                                }}
                              >
                                {item.observacaoComercial}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-2" style={{ verticalAlign: "top", width: "28%" }}>
                          <div style={{ 
                            display: "flex", 
                            flexWrap: "wrap", 
                            gap: "3px",
                            fontSize: "0.65rem",
                            lineHeight: "1.2",
                            maxHeight: "none",
                            minHeight: "20px",
                            overflow: "visible",
                            wordWrap: "break-word"
                          }}>
                            {ordenarTamanhos(item.tamanhos || {}).map(([tamanho, quantidade]) => (
                              <span
                                key={tamanho}
                                style={{
                                  color: "#0369a1",
                                  whiteSpace: "nowrap",
                                  fontSize: "0.65rem",
                                  fontWeight: "500",
                                  marginRight: "2px",
                                  marginBottom: "1px"
                                }}
                                title={`${tamanho}: ${quantidade} unidades`}
                              >
                                {tamanho}-{quantidade}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-2 text-center" style={{ verticalAlign: "middle", width: "8%", fontSize: "0.75rem" }}>
                          {item.quantidade}
                        </td>
                        <td className="p-2 text-right" style={{ verticalAlign: "middle", width: "16%", fontSize: "0.75rem" }}>
                          R$ {item.valorUnitario.toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-medium" style={{ verticalAlign: "middle", width: "16%", fontSize: "0.75rem" }}>
                          R$ {(item.quantidade * item.valorUnitario).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-gray-500 italic">
                        Nenhum item adicionado
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-accent font-medium text-xs">
                  <tr style={{ height: "32px" }}>
                    <td colSpan={4} className="p-2 text-right border-t-2 border-primary text-xs">
                      Valor dos Produtos:
                    </td>
                    <td className="p-2 text-right border-t-2 border-primary text-xs">R$ {calcularTotal().toFixed(2)}</td>
                  </tr>
                  {orcamento.valorFrete !== undefined && orcamento.valorFrete > 0 && (
                    <tr style={{ height: "32px" }}>
                      <td colSpan={4} className="p-2 text-right text-xs">
                        Valor do Frete:
                      </td>
                      <td className="p-2 text-right text-xs">R$ {orcamento.valorFrete.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr style={{ height: "32px" }}>
                    <td colSpan={4} className="p-2 text-right border-t-2 border-primary text-xs">
                      TOTAL:
                    </td>
                    <td className="p-2 text-right border-t-2 border-primary whitespace-nowrap text-xs">
                      R$ {(calcularTotal() + (orcamento.valorFrete || 0)).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="space-y-2 page-break-inside-avoid" style={{ marginTop: "6px" }}>
              {/* Observações em linha única */}
              <div>
                <h3 className="font-bold mb-1 text-primary text-sm">OBSERVAÇÕES</h3>
                <p className="text-xs bg-accent p-2 rounded-md" style={{ 
                  minHeight: "24px", 
                  maxHeight: "40px", 
                  overflow: "hidden",
                  lineHeight: "1.3"
                }}>
                  {orcamento.observacoes || "Nenhuma observação."}
                </p>
              </div>

              {/* Condições, Prazo e Validade em linha horizontal */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-accent p-2 rounded-md" style={{ minHeight: "45px" }}>
                  <h4 className="font-bold text-primary mb-1 text-xs">Condições de Pagamento</h4>
                  <p className="text-xs leading-tight">{orcamento.condicoesPagamento}</p>
                </div>
                <div className="bg-accent p-2 rounded-md" style={{ minHeight: "45px" }}>
                  <h4 className="font-bold text-primary mb-1 text-xs">Prazo de Entrega</h4>
                  <p className="text-xs leading-tight">{orcamento.prazoEntrega}</p>
                </div>
                <div className="bg-accent p-2 rounded-md" style={{ minHeight: "45px" }}>
                  <h4 className="font-bold text-primary mb-1 text-xs">Validade do Orçamento</h4>
                  <p className="text-xs leading-tight">{orcamento.validadeOrcamento}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ficha Técnica - Renderizar apenas se for modo completo ou modo ficha */}
      {(modoExportacao === "completo" || modoExportacao === "ficha") &&
        orcamento.itens.map((item, index) => (
          <div
            key={`ficha-${item.id}`}
            id={`ficha-${item.id}`}
            className={`border border-gray-300 rounded-md overflow-hidden shadow-sm ${
              index > 0 || modoExportacao === "completo" ? "mt-8" : ""
            } ${modoExportacao === "completo" ? "page-break-before" : ""} ficha-tecnica pdf-section`}
          >
            <div className="bg-gradient-to-r from-primary to-primary-dark p-4 pdf-header w-full">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {dadosEmpresa?.logo_url ? (
                    <div
                      className="bg-white p-2 rounded-md shadow-md flex items-center justify-center"
                      style={{ width: "50px", height: "50px" }}
                    >
                      <img
                        src={dadosEmpresa.logo_url || "/placeholder.svg"}
                        alt={nomeEmpresa}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div
                      className="bg-white p-2 rounded-md shadow-md flex items-center justify-center"
                      style={{ width: "50px", height: "50px" }}
                    >
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M12 2L4 5v14.5c0 .83.67 1.5 1.5 1.5h13c.83 0 1.5-.67 1.5-1.5V5l-8-3z"
                          fill="#0f4c81"
                          stroke="#0f4c81"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M12 6.5c-1.93 0-3.5 1.57-3.5 3.5v1.5h7v-1.5c0-1.93-1.57-3.5-3.5-3.5z"
                          fill="white"
                          stroke="white"
                          strokeWidth="0.5"
                        />
                        <path
                          d="M12 14.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"
                          fill="white"
                          stroke="white"
                          strokeWidth="0.5"
                        />
                      </svg>
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-bold text-white font-sans tracking-tight uppercase">
                      FICHA TÉCNICA - {orcamento.numero.split(" - ")[0]}
                    </h1>
                    <p className="text-white/90 text-sm uppercase">
                      {orcamento.cliente?.nome || "EMPRESA"} -{" "}
                      {orcamento.nomeContato || orcamento.cliente?.contato || "CONTATO"}
                    </p>
                  </div>
                </div>
                <div className="text-right bg-white/10 p-2 rounded-md backdrop-blur-sm">
                  <h2 className="text-lg font-bold text-white font-sans tracking-tight">{nomeEmpresa}</h2>
                  <p className="text-white/80 text-xs">CNPJ: {cnpjEmpresa}</p>
                  <p className="text-white/80 text-xs">{emailEmpresa}</p>
                  <p className="text-white/80 text-xs">{telefoneEmpresa}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 pdf-content">
              <h3 className="font-bold text-lg mb-4 text-primary border-b-2 border-primary pb-2">
                {item.produto?.nome}
              </h3>

              <div className="space-y-4">
                <div className="pdf-image-container text-center">
                  <img
                    src={item.imagem || "/placeholder.svg"}
                    alt={item.produto?.nome || "Imagem do produto"}
                    className="pdf-image mx-auto"
                    style={{ maxWidth: "70%", maxHeight: "420px", objectFit: "contain" }}
                  />
                </div>

                <div>
                  <h4 className="font-bold mb-2 text-primary">Especificações do Produto</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Card para Tecido */}
                    <div className="bg-accent/30 rounded-lg overflow-hidden border border-primary/10 shadow-sm spec-card">
                      <div className="bg-primary/10 p-2 border-b border-primary/10">
                        <h5 className="font-medium text-primary">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16v-3"></path>
                            <path d="m7.5 4.27 9 5.15"></path>
                            <polyline points="3.29 7 12 12 20.71 7"></polyline>
                            <line x1="12" y1="22" x2="12" y2="12"></line>
                          </svg>
                          Tecido
                        </h5>
                      </div>
                      <div className="spec-content">
                        {item.tecidoSelecionado ? (
                          <div>
                            <p className="font-medium">{item.tecidoSelecionado.nome}</p>
                            <p className="text-sm">{item.tecidoSelecionado.composicao}</p>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">Não especificado</p>
                        )}
                      </div>
                    </div>

                    {/* Card para Cor */}
                    <div className="bg-accent/30 rounded-lg overflow-hidden border border-primary/10 shadow-sm spec-card">
                      <div className="bg-primary/10 p-2 border-b border-primary/10">
                        <h5 className="font-medium text-primary">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="13.5" cy="6.5" r="2.5"></circle>
                            <circle cx="19" cy="17" r="2"></circle>
                            <circle cx="9" cy="17" r="2.5"></circle>
                            <circle cx="4.5" cy="12" r="1.5"></circle>
                            <path d="M8 7c0-2.21 1.79-4 4-4"></path>
                            <path d="M13.5 19c1.38 0 2.5-1.12 2.5-2.5S14.88 14 13.5 14 11 15.12 11 16.5s1.12 2.5 2.5 2.5Z"></path>
                            <path d="M4.5 16.5c0-3.15 2.85-5.5 6-5.5"></path>
                          </svg>
                          Cor
                        </h5>
                      </div>
                      <div className="spec-content">
                        {item.corSelecionada ? (
                          <div className="cor-container">
                            <div
                              className="cor-circle"
                              style={{
                                backgroundColor: item.corSelecionada.toLowerCase().includes("azul")
                                  ? "#1e40af"
                                  : item.corSelecionada.toLowerCase().includes("verde")
                                    ? "#15803d"
                                    : item.corSelecionada.toLowerCase().includes("vermelho")
                                      ? "#b91c1c"
                                      : item.corSelecionada.toLowerCase().includes("amarelo")
                                        ? "#eab308"
                                        : item.corSelecionada.toLowerCase().includes("preto")
                                          ? "#171717"
                                          : item.corSelecionada.toLowerCase().includes("branco")
                                            ? "#ffffff"
                                            : item.corSelecionada.toLowerCase().includes("cinza")
                                              ? "#6b7280"
                                              : item.corSelecionada.toLowerCase().includes("marrom")
                                                ? "#78350f"
                                                : item.corSelecionada.toLowerCase().includes("laranja")
                                                  ? "#ea580c"
                                                  : item.corSelecionada.toLowerCase().includes("roxo")
                                                    ? "#7e22ce"
                                                    : item.corSelecionada.toLowerCase().includes("rosa")
                                                      ? "#be185d"
                                                      : "#9ca3af",
                              }}
                            ></div>
                            <span className="cor-nome">{item.corSelecionada}</span>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">Não especificada</p>
                        )}
                      </div>
                    </div>

                    {/* Card para Artes */}
                    <div className="bg-accent/30 rounded-lg overflow-hidden border border-primary/10 shadow-sm spec-card">
                      <div className="bg-primary/10 p-2 border-b border-primary/10">
                        <h5 className="font-medium text-primary">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 19c.5 0 1-.1 1.4-.4l5.3-5.3c.4-.4.4-1 0-1.4l-5.3-5.3c-.4-.3-.9-.4-1.4-.4s-1 .1-1.4.4L5.3 11.9c-.4.4-.4 1 0 1.4l5.3 5.3c.4.3.9.4 1.4.4Z"></path>
                            <path d="M7.5 10.5 12 6l4.5 4.5"></path>
                            <path d="M7.5 13.5 12 18l4.5-4.5"></path>
                          </svg>
                          Artes
                        </h5>
                      </div>
                      <div className="spec-content">
                        {item.estampas && item.estampas.length > 0 ? (
                          <div className="artes-list">
                            {item.estampas.map((estampa, index) => (
                              <div key={estampa.id} className="arte-item">
                                <span className="arte-numero">{index + 1}</span>
                                <div className="arte-info">
                                  <div className="arte-posicao">{estampa.posicao || "Posição não especificada"}</div>
                                  <div className="arte-detalhes">
                                    {estampa.tipo}
                                    {estampa.largura ? `, ${estampa.largura} cm` : ""}
                                    {estampa.comprimento ? ` x ${estampa.comprimento} cm` : ""}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">Sem artes aplicadas</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Tamanhos */}
                  <div className="mt-6">
                    <h4 className="font-bold mb-2 text-primary">Tabela de Tamanhos</h4>
                    <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                      {ordenarTamanhos(item.tamanhos || {}).length > 0 ? (
                        <table className="tamanhos-table">
                          <tbody>
                            <tr>
                              <th>Tam.</th>
                              {ordenarTamanhos(item.tamanhos || {}).map(([tamanho, _]) => (
                                <th key={`header-${tamanho}`}>{tamanho}</th>
                              ))}
                            </tr>
                            <tr>
                              <td>Qtd.</td>
                              {ordenarTamanhos(item.tamanhos || {}).map(([tamanho, quantidade]) => (
                                <td key={`qty-${tamanho}`}>{quantidade}</td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      ) : (
                        <div className="py-3 px-3 text-center text-gray-500 italic">Nenhum tamanho especificado</div>
                      )}
                    </div>
                  </div>
                </div>

                {item.observacaoTecnica && (
                  <div>
                    <h4 className="font-bold mb-1 md:mb-2 text-primary text-sm md:text-base">Observações Técnicas</h4>
                    <p
                      className="text-xs md:text-sm bg-accent p-2 md:p-3 rounded-md pdf-observacoes-tecnica"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {item.observacaoTecnica}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
    </div>
  )
}

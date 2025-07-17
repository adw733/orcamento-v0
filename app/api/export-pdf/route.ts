import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  let browser: any = null

  try {
    const { htmlContent, orcamentoNumero } = await request.json()

    if (!htmlContent) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      )
    }

    // Configuração diferente para desenvolvimento vs produção
    const isDevelopment = process.env.NODE_ENV === 'development'

    if (isDevelopment) {
      // Usar puppeteer completo no desenvolvimento
      const puppeteer = require('puppeteer')
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-animations',
          '--disable-background-timer-throttling',
          '--disable-restore-session-state',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--font-render-hinting=none'
        ]
      })
    } else {
      // Usar chromium otimizado para produção
      const chromium = require('@sparticuz/chromium')
      const puppeteer = require('puppeteer-core')

      browser = await puppeteer.launch({
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
        defaultViewport: chromium.defaultViewport,
        args: [
          ...chromium.args,
          '--hide-scrollbars',
          '--disable-web-security',
          '--font-render-hinting=none'
        ]
      })
    }

    const page = await browser.newPage()

    // Configurar viewport para uma boa qualidade em A4
    await page.setViewport({
      width: 794,  // Largura A4 em pixels (210mm)
      height: 1123, // Altura A4 em pixels (297mm)
      deviceScaleFactor: 2 // Para melhor qualidade
    })

    // HTML completo com estilos otimizados para A4
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Orçamento ${orcamentoNumero || ''}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              size: A4;
              margin: 15mm;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.4;
              color: #333;
              background: white;
              font-size: 12px;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            
            .pdf-container {
              width: 100%;
              max-width: none;
              margin: 0;
              padding: 0;
              background: white;
              min-height: 100vh;
            }
            
            /* Garantir que as cores sejam impressas */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            /* Ajustar tamanhos de fonte para A4 */
            h1 { font-size: 18px; margin-bottom: 8px; }
            h2 { font-size: 16px; margin-bottom: 6px; }
            h3 { font-size: 14px; margin-bottom: 4px; }
            h4 { font-size: 12px; margin-bottom: 3px; }
            
            /* Estilos para tabelas */
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
            }
            
            th, td {
              border: 1px solid #ddd;
              padding: 6px 8px;
              text-align: left;
              font-size: 11px;
            }
            
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            
            /* Ajustar espaçamentos */
            .mb-2 { margin-bottom: 8px; }
            .mb-3 { margin-bottom: 12px; }
            .mb-4 { margin-bottom: 16px; }
            
            .p-2 { padding: 8px; }
            .p-3 { padding: 12px; }
            .p-4 { padding: 16px; }
            
            /* Garantir que bordas e fundos sejam preservados */
            .border, .bg-gray-50, .bg-blue-50, .bg-blue-600 {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            /* Ajustar cores para melhor visibilidade no PDF */
            .bg-blue-600 {
              background-color: #1e40af !important;
              color: white !important;
            }
            
            .text-blue-600 {
              color: #1e40af !important;
            }
            
            /* Evitar quebras de página em elementos importantes */
            .no-break {
              page-break-inside: avoid;
            }
            
            /* Estilos específicos para o cabeçalho */
            .header-section {
              background-color: #1e40af !important;
              color: white !important;
              padding: 12px;
              margin-bottom: 16px;
            }
            
            /* Garantir visibilidade de texto em fundos coloridos */
            .header-section * {
              color: white !important;
            }
          </style>
        </head>
        <body>
          <div class="pdf-container">
            ${htmlContent}
          </div>
        </body>
      </html>
    `

    // Definir o conteúdo da página
    await page.setContent(fullHtml, { 
      waitUntil: ['networkidle0', 'domcontentloaded']
    })

    // Aguardar que as fontes sejam carregadas
    await page.evaluateHandle('document.fonts.ready')

    // Gerar o PDF com configurações otimizadas para A4
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      scale: 1.0,
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
      },
      displayHeaderFooter: false
    })

    await browser.close()

    // Retornar o PDF como resposta
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="orcamento-${orcamentoNumero || 'documento'}.pdf"`
      }
    })

  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('Erro ao fechar browser:', closeError)
      }
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor ao gerar PDF' },
      { status: 500 }
    )
  }
}

# PDF Pro - Sistema de Exportação Avançada

## Visão Geral

O **PDF Pro** é um sistema de exportação de PDF que utiliza **html2canvas + jsPDF** para gerar documentos idênticos à visualização na tela, com precisão de pixel.

## Características Principais

### 🎯 Precisão Total
- **Captura pixel-perfect** do layout exibido
- **Resolução ultra alta** (3x scale) para máxima qualidade
- **Preservação completa** de cores, fontes e estilos

### 🚀 Performance Otimizada
- **Captura por seções** para melhor controle de paginação
- **Processamento assíncrono** para não travar a interface
- **Timeout otimizado** para imagens e elementos complexos

### 📄 Paginação Inteligente
- **Quebra automática** de páginas A4
- **Margens consistentes** (10mm em todos os lados)
- **Preservação de layout** entre páginas

## Como Funciona

### 1. Captura do Layout
```typescript
const canvas = await html2canvas(element, {
  scale: 3, // Resolução ultra alta
  useCORS: true,
  allowTaint: true,
  backgroundColor: '#ffffff',
  // ... outras configurações
})
```

### 2. Processamento por Seções
- **Orçamento Principal**: Capturado como primeira seção
- **Fichas Técnicas**: Cada ficha capturada separadamente
- **Paginação**: Cada seção pode gerar múltiplas páginas

### 3. Geração do PDF
```typescript
const pdf = new jsPDF('p', 'mm', 'a4')
pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', margin, margin + position, contentWidth, imgHeight)
```

## Vantagens sobre o Sistema Anterior

| Aspecto | Sistema Anterior (Puppeteer) | PDF Pro (html2canvas) |
|---------|------------------------------|----------------------|
| **Precisão** | ~95% | 100% |
| **Velocidade** | Lenta (servidor) | Rápida (cliente) |
| **Dependências** | Puppeteer + Chromium | html2canvas + jsPDF |
| **Deploy** | Complexo | Simples |
| **Custo** | Alto (servidor) | Baixo (cliente) |

## Configurações Técnicas

### Resolução
- **Scale**: 3x (ultra alta qualidade)
- **Formato**: PNG com qualidade máxima
- **Dimensões**: A4 (210mm x 297mm)

### Margens e Espaçamento
- **Margem**: 10mm em todos os lados
- **Conteúdo**: 190mm de largura útil
- **Altura útil**: 277mm por página

### Timeouts
- **Imagens**: 30 segundos
- **Renderização**: 1 segundo inicial
- **Entre seções**: 200ms

## Uso

### Botão de Exportação
O botão "Exportar PDF Pro" está localizado no topo da visualização do documento.

### Estados do Botão
- **Normal**: Verde com ícone de PDF
- **Processando**: Animação de loading + texto "Gerando PDF Pro..."
- **Desabilitado**: Durante o processamento

### Nome do Arquivo
```
orcamento-{NUMERO}-pro.pdf
```

## Troubleshooting

### Problemas Comuns

1. **PDF não gera**
   - Verificar se há imagens não carregadas
   - Aguardar carregamento completo da página
   - Verificar console para erros

2. **Qualidade baixa**
   - Verificar se o scale está em 3
   - Confirmar que as imagens estão em alta resolução
   - Verificar se não há zoom no navegador

3. **PDF muito grande**
   - Reduzir scale para 2 se necessário
   - Otimizar imagens antes do upload
   - Verificar se não há elementos desnecessários

### Logs de Debug
```typescript
console.error('Erro ao gerar PDF Pro:', error)
```

## Limitações

1. **Tamanho do arquivo**: PDFs podem ser grandes devido à alta resolução
2. **Tempo de processamento**: Pode demorar alguns segundos para documentos complexos
3. **Navegador**: Funciona melhor em Chrome/Edge modernos

## Futuras Melhorias

- [ ] Compressão inteligente de imagens
- [ ] Cache de elementos renderizados
- [ ] Progress bar durante geração
- [ ] Opções de qualidade configuráveis
- [ ] Suporte a múltiplos formatos de página

## Dependências

```json
{
  "html2canvas": "latest",
  "jspdf": "latest"
}
```

## Compatibilidade

- ✅ Chrome 80+
- ✅ Edge 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ❌ Internet Explorer (não suportado) 
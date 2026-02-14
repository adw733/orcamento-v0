import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Image, Svg, Path } from '@react-pdf/renderer'
import type { Orcamento, DadosEmpresa } from '@/types/types'

// Registrar fontes (opcional, para melhor tipografia)
// Font.register({
//   family: 'Roboto',
//   src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf'
// })

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#0f4c81',
    padding: 15,
    marginBottom: 15,
    borderRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    padding: 5,
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#e0e0e0',
  },
  headerRight: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 4,
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  companyInfo: {
    fontSize: 8,
    color: '#e0e0e0',
    marginBottom: 1,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f4c81',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#0f4c81',
    paddingBottom: 3,
  },
  clientBox: {
    backgroundColor: '#f0f4f8',
    padding: 12,
    borderRadius: 4,
  },
  clientRowTwoCol: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 20,
  },
  clientCol: {
    flexDirection: 'row',
    flex: 1,
  },
  clientRowAddress: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  clientLabel: {
    fontWeight: 'bold',
    marginRight: 5,
    fontSize: 9,
    color: '#0f4c81',
  },
  clientValue: {
    fontSize: 9,
    flex: 1,
  },
  clientValueAddress: {
    fontSize: 9,
    flex: 1,
    flexWrap: 'wrap',
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f4c81',
    color: '#ffffff',
    padding: 6,
    fontWeight: 'bold',
    fontSize: 9,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 6,
    fontSize: 9,
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  colNum: {
    width: '5%',
    textAlign: 'center',
  },
  colProduto: {
    width: '30%',
  },
  colTamanhos: {
    width: '25%',
  },
  colQtd: {
    width: '8%',
    textAlign: 'center',
  },
  colValorUnit: {
    width: '13%',
    textAlign: 'right',
  },
  colDescontoUnit: {
    width: '10%',
    textAlign: 'right',
  },
  colTotal: {
    width: '14%',
    textAlign: 'right',
  },
  productName: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  productObs: {
    fontSize: 8,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  tamanhosBadge: {
    fontSize: 8,
    color: '#0369a1',
    marginRight: 4,
  },
  totalSection: {
    backgroundColor: '#f0f4f8',
    padding: 8,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: 9,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalValue: {
    fontWeight: 'bold',
  },
  totalFinal: {
    borderTopWidth: 2,
    borderTopColor: '#0f4c81',
    paddingTop: 6,
    marginTop: 4,
    fontSize: 11,
    color: '#0f4c81',
  },
  observacoesBox: {
    backgroundColor: '#f0f4f8',
    padding: 10,
    borderRadius: 4,
    marginTop: 8,
  },
  observacoesText: {
    fontSize: 9,
    lineHeight: 1.4,
  },
  footerGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  footerBox: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    padding: 8,
    borderRadius: 4,
  },
  footerBoxTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f4c81',
    marginBottom: 4,
  },
  footerBoxText: {
    fontSize: 8,
    lineHeight: 1.3,
  },
  dateBox: {
    fontSize: 9,
    backgroundColor: '#f0f4f8',
    padding: 6,
    borderRadius: 15,
    textAlign: 'center',
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
})

interface PDFOrcamentoProps {
  orcamento: Orcamento
  dadosEmpresa?: DadosEmpresa
  calcularTotal: () => number
}

const ordenarTamanhos = (tamanhos: Record<string, number>) => {
  const ordemLetras = ["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]
  
  return Object.entries(tamanhos)
    .filter(([_, quantidade]) => quantidade > 0)
    .sort((a, b) => {
      const indexA = ordemLetras.indexOf(a[0])
      const indexB = ordemLetras.indexOf(b[0])
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB
      }
      
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      
      const numA = parseInt(a[0])
      const numB = parseInt(b[0])
      
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }
      
      return a[0].localeCompare(b[0])
    })
}

export const PDFOrcamento: React.FC<PDFOrcamentoProps> = ({ orcamento, dadosEmpresa, calcularTotal }) => {
  const total = calcularTotal()
  const subtotal = total + (orcamento.valorFrete || 0)
  
  // Calcular subtotal bruto (sem descontos unitários)
  const subtotalBruto = orcamento.itens.reduce((total, item) => {
    return total + item.quantidade * item.valorUnitario
  }, 0)
  
  // Calcular total de descontos unitários
  const totalDescontoUnitario = orcamento.itens.reduce((total, item) => {
    const descontoPercentual = item.descontoUnitarioPercentual || 0
    if (descontoPercentual > 0) {
      const valorDesconto = item.quantidade * item.valorUnitario * (descontoPercentual / 100)
      return total + valorDesconto
    }
    return total
  }, 0)
  
  // Calcular desconto geral (agora sempre em valor)
  const valorDescontoCalculado = orcamento.valorDesconto || 0
  
  const totalFinal = subtotal - valorDescontoCalculado

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.logoContainer}>
                <Svg width="40" height="40" viewBox="0 0 24 24">
                  <Path d="M12 2L4 5v14.5c0 .83.67 1.5 1.5 1.5h13c.83 0 1.5-.67 1.5-1.5V5l-8-3z" fill="#0f4c81" stroke="#0f4c81" strokeWidth="1.5"/>
                  <Path d="M12 6.5c-1.93 0-3.5 1.57-3.5 3.5v1.5h7v-1.5c0-1.93-1.57-3.5-3.5-3.5z" fill="white" stroke="white" strokeWidth="0.5"/>
                  <Path d="M12 14.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" fill="white" stroke="white" strokeWidth="0.5"/>
                </Svg>
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  ORÇAMENTO - {orcamento.numero.split(" - ")[0]}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {orcamento.cliente?.nome || "CLIENTE"} - {orcamento.nomeContato || "CONTATO"}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.companyName}>{dadosEmpresa?.nome || "OneBase Uniformes"}</Text>
              <Text style={styles.companyInfo}>CNPJ: {dadosEmpresa?.cnpj || "57.855.073/0001-82"}</Text>
              <Text style={styles.companyInfo}>{dadosEmpresa?.email || "onebase.store@gmail.com"}</Text>
              <Text style={styles.companyInfo}>{dadosEmpresa?.telefone || "(11) 99541-6072"}</Text>
            </View>
          </View>
        </View>

        {/* Dados do Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DADOS DO CLIENTE</Text>
          <View style={styles.clientBox}>
            {/* Linha 1: Nome e CNPJ */}
            <View style={styles.clientRowTwoCol}>
              <View style={styles.clientCol}>
                <Text style={styles.clientLabel}>Nome:</Text>
                <Text style={styles.clientValue}>{orcamento.cliente?.nome || "-"}</Text>
              </View>
              <View style={styles.clientCol}>
                <Text style={styles.clientLabel}>CNPJ:</Text>
                <Text style={styles.clientValue}>{orcamento.cliente?.cnpj || "-"}</Text>
              </View>
            </View>
            
            {/* Linha 2: Endereço (largura total com quebra) */}
            <View style={styles.clientRowAddress}>
              <Text style={styles.clientLabel}>Endereço:</Text>
              <Text style={styles.clientValueAddress}>{orcamento.cliente?.endereco || "-"}</Text>
            </View>
            
            {/* Linha 3: Email e Telefone */}
            <View style={styles.clientRowTwoCol}>
              <View style={styles.clientCol}>
                <Text style={styles.clientLabel}>Email:</Text>
                <Text style={styles.clientValue}>{orcamento.cliente?.email || "-"}</Text>
              </View>
              <View style={styles.clientCol}>
                <Text style={styles.clientLabel}>Telefone:</Text>
                <Text style={styles.clientValue}>{orcamento.cliente?.telefone || "-"}</Text>
              </View>
            </View>
            
            {/* Linha 4: Contato e Tel. Contato */}
            <View style={styles.clientRowTwoCol}>
              <View style={styles.clientCol}>
                <Text style={styles.clientLabel}>Contato:</Text>
                <Text style={styles.clientValue}>{orcamento.nomeContato || "-"}</Text>
              </View>
              <View style={styles.clientCol}>
                <Text style={styles.clientLabel}>Tel. Contato:</Text>
                <Text style={styles.clientValue}>{orcamento.telefoneContato || "-"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Data */}
        <View style={styles.dateBox}>
          <Text>Data: {new Date(orcamento.data + "T12:00:00").toLocaleDateString("pt-BR")}</Text>
        </View>

        {/* Itens do Orçamento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ITENS DO ORÇAMENTO</Text>
          <View style={styles.table}>
            {/* Header da Tabela */}
            <View style={styles.tableHeader}>
              <Text style={styles.colNum}>#</Text>
              <Text style={styles.colProduto}>Produto</Text>
              <Text style={styles.colTamanhos}>Tamanhos</Text>
              <Text style={styles.colQtd}>Qtd.</Text>
              <Text style={styles.colValorUnit}>Valor Unit.</Text>
              <Text style={styles.colDescontoUnit}>Desc. %</Text>
              <Text style={styles.colTotal}>Total</Text>
            </View>

            {/* Linhas da Tabela */}
            {orcamento.itens.map((item, idx) => {
              const descontoPercentual = item.descontoUnitarioPercentual || 0
              const valorComDesconto = item.valorUnitario * (1 - descontoPercentual / 100)
              const totalItem = item.quantidade * valorComDesconto
              
              return (
                <View key={item.id} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={styles.colNum}>{idx + 1}</Text>
                  <View style={styles.colProduto}>
                    <Text style={styles.productName}>{item.produto?.nome || "Produto"}</Text>
                    {item.observacaoComercial && (
                      <Text style={styles.productObs}>{item.observacaoComercial}</Text>
                    )}
                  </View>
                  <View style={styles.colTamanhos}>
                    <Text>
                      {ordenarTamanhos(item.tamanhos || {})
                        .map(([tam, qtd]) => `${tam}-${qtd}`)
                        .join(', ')}
                    </Text>
                  </View>
                  <Text style={styles.colQtd}>{item.quantidade}</Text>
                  <Text style={styles.colValorUnit}>R$ {item.valorUnitario.toFixed(2)}</Text>
                  <Text style={[styles.colDescontoUnit, descontoPercentual > 0 && { color: '#ea580c' }]}>
                    {descontoPercentual > 0 ? `${descontoPercentual.toFixed(1)}%` : '-'}
                  </Text>
                  <Text style={styles.colTotal}>R$ {totalItem.toFixed(2)}</Text>
                </View>
              )
            })}
          </View>

          {/* Totais */}
          <View style={styles.totalSection}>
            {/* Subtotal Bruto */}
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: '#6b7280' }]}>Subtotal Bruto:</Text>
              <Text style={[styles.totalValue, { color: '#6b7280' }]}>R$ {subtotalBruto.toFixed(2)}</Text>
            </View>
            
            {/* Desconto Unitário */}
            {totalDescontoUnitario > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: '#ea580c' }]}>Desconto Unitário (%):</Text>
                <Text style={[styles.totalValue, { color: '#ea580c' }]}>- R$ {totalDescontoUnitario.toFixed(2)}</Text>
              </View>
            )}
            
            {/* Valor dos Produtos (após descontos unitários) */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Valor dos Produtos:</Text>
              <Text style={styles.totalValue}>R$ {total.toFixed(2)}</Text>
            </View>
            
            {/* Frete */}
            {orcamento.valorFrete !== undefined && orcamento.valorFrete > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Valor do Frete:</Text>
                <Text style={styles.totalValue}>R$ {orcamento.valorFrete.toFixed(2)}</Text>
              </View>
            )}
            
            {/* Desconto Geral (apenas em valor) */}
            {valorDescontoCalculado > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Desconto Geral (R$):</Text>
                <Text style={[styles.totalValue, { color: '#dc2626' }]}>- R$ {valorDescontoCalculado.toFixed(2)}</Text>
              </View>
            )}
            
            {/* Total Final */}
            <View style={[styles.totalRow, styles.totalFinal]}>
              <Text style={styles.totalLabel}>TOTAL:</Text>
              <Text style={styles.totalValue}>R$ {totalFinal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Observações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OBSERVAÇÕES</Text>
          <View style={styles.observacoesBox}>
            <Text style={styles.observacoesText}>
              {orcamento.observacoes || "Nenhuma observação."}
            </Text>
          </View>
        </View>

        {/* Footer com condições */}
        <View style={styles.footerGrid}>
          <View style={styles.footerBox}>
            <Text style={styles.footerBoxTitle}>Condições de Pagamento</Text>
            <Text style={styles.footerBoxText}>{orcamento.condicoesPagamento}</Text>
          </View>
          <View style={styles.footerBox}>
            <Text style={styles.footerBoxTitle}>Prazo de Entrega</Text>
            <Text style={styles.footerBoxText}>{orcamento.prazoEntrega}</Text>
          </View>
          <View style={styles.footerBox}>
            <Text style={styles.footerBoxTitle}>Validade do Orçamento</Text>
            <Text style={styles.footerBoxText}>{orcamento.validadeOrcamento}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Svg, Path } from '@react-pdf/renderer'
import type { Orcamento, DadosEmpresa, ItemOrcamento } from '@/types/types'

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
  mainTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f4c81',
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#0f4c81',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemNumber: {
    fontSize: 11,
    fontWeight: 'normal',
    color: '#6b7280',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f4c81',
    marginBottom: 6,
  },
  imageContainer: {
    border: '2px dashed #e5e7eb',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  image: {
    maxWidth: '100%',
    maxHeight: 300,
    objectFit: 'contain',
  },
  imagePlaceholder: {
    fontSize: 9,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  specsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  specCard: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    overflow: 'hidden',
  },
  specCardHeader: {
    backgroundColor: '#e0e7ef',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  specCardHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f4c81',
  },
  specCardContent: {
    padding: 10,
  },
  specLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  specValue: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 3,
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginTop: 4,
  },
  artesItem: {
    fontSize: 8,
    marginBottom: 5,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  artesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  artesBadge: {
    width: 14,
    height: 14,
    backgroundColor: '#dbeafe',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artesBadgeText: {
    fontSize: 7,
    color: '#0f4c81',
    fontWeight: 'bold',
  },
  artesPosition: {
    fontWeight: 'bold',
    fontSize: 8,
  },
  artesDetails: {
    fontSize: 7,
    color: '#6b7280',
    marginLeft: 18,
  },
  artesEmpty: {
    fontSize: 8,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  tableContainer: {
    marginTop: 10,
    marginBottom: 15,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeaderCell: {
    padding: 8,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f4c81',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  tableHeaderCellLast: {
    borderRightWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    padding: 8,
    fontSize: 9,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    textAlign: 'center',
  },
  tableCellLast: {
    borderRightWidth: 0,
  },
  tableCellHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
    textAlign: 'left',
  },
  tableCellTotal: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
    color: '#0369a1',
  },
  observacoesBox: {
    backgroundColor: '#f0f4f8',
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
  },
  observacoesText: {
    fontSize: 9,
    lineHeight: 1.4,
  },
})

interface PDFFichaTecnicaProps {
  orcamento: Orcamento
  item: ItemOrcamento
  itemIndex: number
  dadosEmpresa?: DadosEmpresa
}

const ordenarTamanhos = (tamanhos: Record<string, number>) => {
  const ordemLetras = ["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]
  
  return Object.keys(tamanhos).sort((a, b) => {
    const indexA = ordemLetras.indexOf(a)
    const indexB = ordemLetras.indexOf(b)
    
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB
    }
    
    if (indexA !== -1) return -1
    if (indexB !== -1) return 1
    
    const numA = parseInt(a)
    const numB = parseInt(b)
    
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB
    }
    
    return a.localeCompare(b)
  })
}

const getCorHex = (nome?: string) => {
  if (!nome) return "#cccccc"
  const n = nome.toLowerCase()
  if (n.includes("azul")) return "#1e40af"
  if (n.includes("verde")) return "#15803d"
  if (n.includes("vermelho")) return "#b91c1c"
  if (n.includes("amarelo")) return "#eab308"
  if (n.includes("preto")) return "#171717"
  if (n.includes("branco")) return "#ffffff"
  if (n.includes("cinza")) return "#6b7280"
  return "#9ca3af"
}

export const PDFFichaTecnica: React.FC<PDFFichaTecnicaProps> = ({ 
  orcamento, 
  item, 
  itemIndex, 
  dadosEmpresa 
}) => {
  const tamanhosOrdenados = ordenarTamanhos(item.tamanhos || {})
  
  return (
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
                FICHA TÉCNICA - {orcamento.numero.split(" - ")[0]}
              </Text>
              <Text style={styles.headerSubtitle}>
                {orcamento.cliente?.nome || "EMPRESA"} - {orcamento.nomeContato || orcamento.cliente?.contato || "CONTATO"}
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

      {/* Título do Produto */}
      <View style={styles.mainTitle}>
        <Text>{item.produto?.nome || "Produto"}</Text>
        <Text style={styles.itemNumber}>Item {itemIndex + 1}</Text>
      </View>

      {/* Imagem do Produto */}
      <View style={styles.imageContainer}>
        {item.imagem ? (
          <Image src={item.imagem} style={styles.image} />
        ) : (
          <Text style={styles.imagePlaceholder}>Nenhuma imagem disponível</Text>
        )}
      </View>

      {/* Especificações */}
      <View style={styles.specsGrid}>
        {/* Tecido */}
        <View style={styles.specCard}>
          <View style={styles.specCardHeader}>
            <Text style={styles.specCardHeaderText}>Tecido</Text>
          </View>
          <View style={styles.specCardContent}>
            <Text style={styles.specLabel}>
              {item.tecidoSelecionado?.nome || "Não selecionado"}
            </Text>
            <Text style={styles.specValue}>
              {item.tecidoSelecionado?.composicao || "Composição não especificada"}
            </Text>
          </View>
        </View>

        {/* Cor */}
        <View style={styles.specCard}>
          <View style={styles.specCardHeader}>
            <Text style={styles.specCardHeaderText}>Cor</Text>
          </View>
          <View style={styles.specCardContent}>
            <Text style={styles.specLabel}>
              {item.corSelecionada || "Não selecionada"}
            </Text>
            <View style={[styles.colorSwatch, { backgroundColor: getCorHex(item.corSelecionada) }]} />
          </View>
        </View>

        {/* Artes */}
        <View style={styles.specCard}>
          <View style={styles.specCardHeader}>
            <Text style={styles.specCardHeaderText}>Artes</Text>
          </View>
          <View style={styles.specCardContent}>
            {item.estampas && item.estampas.length > 0 ? (
              item.estampas.map((est, i) => (
                <View key={est.id} style={styles.artesItem}>
                  <View style={styles.artesHeader}>
                    <View style={styles.artesBadge}>
                      <Text style={styles.artesBadgeText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.artesPosition}>{est.posicao}</Text>
                  </View>
                  <Text style={styles.artesDetails}>
                    {est.tipo} - {est.largura}x{est.comprimento} cm
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.artesEmpty}>Sem artes.</Text>
            )}
          </View>
        </View>
      </View>

      {/* Tabela de Tamanhos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tabela de Tamanhos</Text>
        <View style={styles.tableContainer}>
          <View style={styles.table}>
            {/* Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Tam.</Text>
              {tamanhosOrdenados.map((tam, idx) => (
                <Text 
                  key={tam} 
                  style={[
                    styles.tableHeaderCell, 
                    { width: `${70 / tamanhosOrdenados.length}%` },
                    idx === tamanhosOrdenados.length - 1 ? {} : {}
                  ]}
                >
                  {tam}
                </Text>
              ))}
              <Text style={[styles.tableHeaderCell, styles.tableHeaderCellLast, { width: '15%' }]}>
                TOTAL
              </Text>
            </View>

            {/* Row */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellHeader, { width: '15%' }]}>Qtd.</Text>
              {tamanhosOrdenados.map((tam, idx) => (
                <Text 
                  key={tam} 
                  style={[
                    styles.tableCell, 
                    { width: `${70 / tamanhosOrdenados.length}%` },
                    idx === tamanhosOrdenados.length - 1 ? {} : {}
                  ]}
                >
                  {item.tamanhos[tam] || 0}
                </Text>
              ))}
              <Text style={[styles.tableCell, styles.tableCellTotal, styles.tableCellLast, { width: '15%' }]}>
                {item.quantidade}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Observações Técnicas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Observações Técnicas</Text>
        <View style={styles.observacoesBox}>
          <Text style={styles.observacoesText}>
            {item.observacaoTecnica || "Nenhuma observação técnica."}
          </Text>
        </View>
      </View>
    </Page>
  )
}

// Documento completo com todas as fichas
export const PDFTodasFichasTecnicas: React.FC<{
  orcamento: Orcamento
  dadosEmpresa?: DadosEmpresa
}> = ({ orcamento, dadosEmpresa }) => {
  return (
    <Document>
      {orcamento.itens.map((item, idx) => (
        <PDFFichaTecnica
          key={item.id}
          orcamento={orcamento}
          item={item}
          itemIndex={idx}
          dadosEmpresa={dadosEmpresa}
        />
      ))}
    </Document>
  )
}

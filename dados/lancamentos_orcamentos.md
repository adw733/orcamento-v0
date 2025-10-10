# 📝 DADOS INVENTADOS - Orçamentos Inseridos

## 🎯 INSTRUÇÕES PARA INSERÇÃO DE NOVOS ORÇAMENTOS

### 📁 Estrutura de Pastas
Cada orçamento está em: `dados/XXX - Nome do Pedido/`
- Subpastas comuns: `01 - Designer`, `02 - Orçamento`, `03 - Tamanhos`, `04 - Orçamentos`

### 🔍 ORDEM DE BUSCA DE INFORMAÇÕES

#### 1. **TAMANHOS E QUANTIDADES** (Prioridade MÁXIMA)
   - **1º**: Buscar em `Orçamento/*.pdf` ou `Ficha Técnica/*.pdf`
   - **2º**: Procurar arquivos `.xlsx` na pasta `Tamanhos/`
   - **Formato esperado**: Tabela com colunas P, M, G, GG, G1, G2, G3
   - **IMPORTANTE**: EEG, EEEG, EEEG **NÃO EXISTEM MAIS**! Use G1, G2, G3
   - **Conversão**: EEG → G1 | EEEG → G2 | EEEEG → G3

#### 2. **VALORES (UNITÁRIO E TOTAL)**
   - **1º**: Verificar `NF.pdf` (Nota Fiscal) - valor mais confiável
   - **2º**: Verificar `PEDIDO*.pdf` - contém valor unitário e total
   - **3º**: Verificar `orçamento*.pdf` - pode ter valores preenchidos
   - **Se não achar**: Inventar baseado em:
     - Tipo de produto (camiseta ~R$35-40, polo ~R$45-50, jaqueta ~R$95-180)
     - Complexidade (mais estampas = mais caro)
     - Material (PV > PA > Malha comum)

#### 3. **DATA DO ORÇAMENTO**
   - **1º**: Data de emissão na NF
   - **2º**: Data de emissão no Pedido
   - **3º**: Datas dos arquivos (metadata)
   - **Se não achar**: Estimar baseado em nome da pasta ou contexto (ex: "SIPAT 2022" → meio de 2022)

#### 4. **CLIENTE**
   - **1º**: Verificar NF (campo "Tomador de Serviço")
   - **2º**: Verificar Pedido (cabeçalho)
   - **3º**: Nome da pasta pode indicar (ex: "Santec" → cliente SANTEC)
   - **Se não achar**:
     - Criar cliente novo com CNPJ fictício `00.000.000/00XX-00` (XX = número do orçamento)
     - Marcar claramente como inventado no MD

#### 5. **PRODUTO**
   - **1º**: Nome e descrição na Ficha Técnica
   - **2º**: Descrição no Orçamento
   - **Sempre criar produto novo** se não existir
   - Código: `P00XX` (XX = número do orçamento com zeros à esquerda)

#### 6. **ESPECIFICAÇÕES TÉCNICAS**
   - **Tecido/Composição**: Sempre na Ficha Técnica
   - **Cor**: Sempre na Ficha Técnica
   - **Estampas**: Descrição e tamanhos na Ficha Técnica
   - **Bordados**: Verificar se é bordado ou silk/serigrafia

### 🚫 REGRAS IMPORTANTES

1. Nunca criar nada antes de solicitar minha autorização explícita.
2. Primeiro atualize este MD com todas as informações encontradas; marque o status como "Aguardando autorização".
3. Pergunte se está certo; somente com meu OK, atualize o Supabase.
4. Verifique se o orçamento, cliente e produto já existem; se estiver tudo correto, não crie nada.
5. Se faltar algo, descreva no MD o que precisa ser criado e só crie com minha autorização.
6. Nunca sobrescrever dados existentes no Supabase sem autorização.
7. Sempre verificar se orçamento já existe antes de inserir.
8. Numeração com 4 dígitos: 0001, 0002, 0003.
9. Tamanhos modernos: P, M, G, GG, G1, G2, G3.
10. Status padrão: 'aprovado' para orçamentos faturados, após autorização.

### 📝 SCRIPT DE INSERÇÃO (Template)

```javascript
const orcamento = {
  numero: '00XX',
  clienteCNPJ: 'XX.XXX.XXX/XXXX-XX', // ou criar novo
  produtoNome: 'NOME DO PRODUTO',
  produtoCodigo: 'P00XX',
  data: 'YYYY-MM-DD',
  tamanhos: { P: X, M: X, G: X, GG: X, G1: X },
  quantidade: XX,
  valorUnitario: XX.XX,
  tecido: 'NOME DO TECIDO',
  composicao: 'XX% Material',
  cor: 'COR',
  estampa: 'Descrição das estampas/bordados'
}
```

### ✅ CHECKLIST DE VALIDAÇÃO

Antes de finalizar, verificar:
- [ ] Tamanhos conferem com ficha técnica?
- [ ] Quantidade total bate com soma dos tamanhos?
- [ ] Valor unitário * quantidade = valor total?
- [ ] Cliente existe ou foi criado corretamente?
- [ ] Produto foi criado com código único?
- [ ] Data é real (de NF/Pedido) ou estimada?
- [ ] Todas as informações inventadas estão marcadas no MD?

### 📊 FORMATO DO MD (Para cada orçamento)

```markdown
## 📄 ORÇAMENTO #00XX - NOME DO PRODUTO
- ✅/❌ **Cliente** : NOME DO CLIENTE (CNPJ: XX.XXX.XXX/XXXX-XX)
- ✅/❌ **Produto** : P00XX - NOME DO PRODUTO
- ✅/❌ **Data** : DD/MM/YYYY
- ✅/❌ **Tamanhos** : 10G (exemplo)
- ✅/❌ **Quantidade** : XX unidades
- ✅/❌ **Valor unitário** : R$ XX,XX
- ✅/❌ **Valor Total** : R$ X.XXX,XX
- ✅/❌ **Descrição** : DESCRIÇÃO DO PRODUTO
- 🔄 **Status** : Aguardando autorização | Inserido no Supabase | Dados insuficientes | Corrigido e verificado
```

### 🧭 Dinâmica de Processamento (Bolt.new style)

1. Você escolhe a pasta do orçamento.
2. Eu busco os dados na pasta, padronizo e ATUALIZO este MD no formato de orçamento especificado.
3. Eu pergunto: "Está correto? Posso atualizar o Supabase?"
4. Se autorizado:
   - Valido existência de cliente, produto e orçamento; se já existirem corretamente, sigo sem criar nada.
   - Se faltar algo, crio apenas o necessário conforme sua orientação explícita.
5. Registro no MD o status: "Inserido no Supabase" ou "Corrigido e verificado". Se não autorizado, mantenho "Aguardando autorização".

### 🔧 SCRIPTS ÚTEIS

- `inserir-orcamento-00XX.js` - Inserção individual
- `validar-todos-orcamentos.js` - Validação geral
- `verificar-001.js` - Verificar orçamento específico
- `corrigir-00XX.js` - Corrigir dados errados

---

Sempre consultar se os produtos estao nessa lista, todos os produtos devem ser dessa lista: produtos_rows.csv

# 📋 ORÇAMENTOS INSERIDOS
"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0001 - CAMISETA BRIGADA MIZU
✅ Cliente: MIZU CIMENTOS (CNPJ: 29.067.113/0139-21)
✅ Produto: P0001 - CAMISETA
✅ Data: 04/03/2022
✅ Tamanhos: M: 9, G: 5, GG: 1, G1: 2
✅ Quantidade: 17 unidades
✅ Valor unitário: R$ 39,00
✅ Valor Total: R$ 663,00
✅ Descrição: Camiseta para Brigada MIZU.
✅ Status: Inserido no Supabase

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0002 - CAMISETAS GETPHONE
✅ Cliente: GETPHONE - ASSISTÊNCIA TÉCNICA (CNPJ: 00.000.000/0001-00)
✅ Produto: P0001 - CAMISETA
❌ Data: 15/05/2022 (estimada)
✅ Tamanhos: M: 3, G: 3, G1: 3, G3: 6, G6: 3
✅ Quantidade: 18 unidades
❌ Valor unitário: R$ 35,00 (baseado em mercado)
❌ Valor Total: R$ 630,00
✅ Descrição: Camisetas para Getphone.
✅ Status: Inserido no Supabase

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0003 - CAMISETA EREP MIZU 2022
✅ Cliente: MIZU CIMENTOS (CNPJ: 29.067.113/0139-21)
✅ Produto: P0001 - CAMISETA
❌ Data: 10/08/2022 (estimada EREP 2022)
✅ Tamanhos: P: 4, M: 23, G: 33, GG: 3, G1: 2
✅ Quantidade: 65 unidades
❌ Valor unitário: R$ 38,00 (baseado em complexidade)
❌ Valor Total: R$ 2.470,00
✅ Descrição: Camiseta para evento EREP 2022 da MIZU.
✅ Status: Inserido no Supabase

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0005 - CAMISETA POLO SIPAT MIZU
✅ Cliente: MIZU CIMENTOS (CNPJ: 29.067.113/0139-21)
✅ Produto: P0003 - CAMISA POLO
✅ Data: 08/07/2022
✅ Tamanhos: P: 4, M: 22, G: 30, GG: 2, G2: 2
✅ Quantidade: 60 unidades
✅ Valor unitário: R$ 47,50
✅ Valor Total: R$ 2.850,00
✅ Descrição: Camisa Polo para evento SIPAT da MIZU.
✅ Status: Inserido no Supabase

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0006 - JAQUETA NYLON SANTEC
✅ Cliente: SANTEC (CNPJ: 25.195.283/0001-03)
❌ Data: 15/09/2022 (estimada)
✅ Produto: P0006 - JAQUETA DE NYLON
✅ Tamanhos: M: 12, G: 12, GG: 8, G2: 2
✅ Quantidade: 34 unidades
❌ Valor unitário: R$ 95,00 (estimado)
❌ Valor Total: R$ 3.230,00
✅ Descrição: Jaqueta de Nylon para Santec.
✅ Status: Inserido no Supabase

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0007 - UNIFORME GRUPO DESTAQUE
✅ Cliente: GRUPO DESTAQUE (CNPJ: 00.000.000/0007-00)
❌ Data: 01/10/2022 (estimada)
❌ Tamanhos: M: 10, G: 10, GG: 5 (estimado)
❌ Quantidade: 25 unidades (estimada)
❌ Valor unitário: R$ 45,00 (estimado)
❌ Valor Total: R$ 1.125,00
✅ Descrição: Uniforme para Grupo Destaque.
✅ Status: Inserido no Supabase

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0009 - JAQUETA MIZU FMO
✅ Cliente: MIZU CIMENTOS (CNPJ: 29.067.113/0139-21)
✅ Produto: P0006 - JAQUETA DE NYLON
✅ Data: 09/11/2022
✅ Tamanhos: M: 3, G: 3, GG: 1
✅ Quantidade: 7 unidades
✅ Valor unitário: R$ 180,00
✅ Valor Total: R$ 1.260,00
✅ Descrição: Jaqueta modelo MIZU FMO.
✅ Status: Inserido no Supabase

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0010 - CAPAS EQUIPAMENTOS LABORATÓRIO MIZU
✅ Cliente: MIZU CIMENTOS (CNPJ: 29.067.113/0139-21)
✅ Data: 03/10/2022
✅ Produtos:
Capa para Micro-ondas (R$ 100,00)
Capa para Prensa (R$ 250,00)
Capa para Granulômetro (R$ 200,00)
Capa para Raio X (R$ 150,00)
✅ Quantidade: 4 unidades (1 de cada)
✅ Valor Total: R$ 700,00
✅ Descrição: Capas de proteção em tecido NAPA para equipamentos de laboratório.
✅ Status: Inserido e verificado no Supabase

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0011 - UNIFORME SANTEC
✅ Cliente: SANTEC (CNPJ: 25.195.283/0001-03)
✅ Data: 23/08/2022
✅ Produto 1: P0008 - CAMISA OPERACIONAL ABERTA BRIM
Tamanhos: M: 10, G: 11, GG: 8, G1: 1 = 30 unidades
Tecido: BRIM LEVE - Cor Petróleo
Valor unitário: R$ 75,00
✅ Produto 2: P0002 - CALÇA OPERACIONAL BRIM
Tamanhos: M: 10, G: 12, GG: 6, G1: 2 = 30 unidades
Tecido: BRIM PESADO - Cor Petróleo
Valor unitário: R$ 75,00 (estimado, baseado no valor total)
✅ Quantidade Total: 60 peças
✅ Valor Total: R$ 4.500,00
✅ Descrição: Uniforme profissional com faixas refletivas e logo bordado.
✅ Status: Corrigido e verificado no Supabase

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0012 - JAQUETA DE NYLON
✅ Cliente: SANTEC (CNPJ: 25.195.283/0001-03)
✅ Produto: P0006 - JAQUETA DE NYLON
✅ Data: 01/11/2022
✅ Tamanhos: M: 2, G: 4
✅ Quantidade: 6 unidades
✅ Valor unitário: R$ 180,00
✅ Valor Total: R$ 1.080,00
✅ Descrição: Jaqueta de Nylon 210 Resinado (100% Poliamida) com Matelassê, cor Marinho, com bordado e faixas refletivas.
✅ Status: Inserido e verificado no Supabase

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0014 - JAQUETA DE NYLON
✅ Cliente: SANTEC (CNPJ: 25.195.283/0001-03)
✅ Produto: P0006 - JAQUETA DE NYLON
✅ Data: 16/12/2022
✅ Tamanhos: M: 2, G: 4
✅ Quantidade: 6 unidades
✅ Valor unitário: R$ 180,00
✅ Valor Total: R$ 1.080,00
✅ Descrição: Jaqueta de Nylon com bordado personalizado.
✅ Status: Inserido e verificado no Supabase

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0015 - CAMISETA FEMININA PERSONALIZADA SANTEC
✅ Cliente: SANTEC (CNPJ: 25.195.283/0001-03)
✅ Produto: P0021 - CAMISETA FEMININA
✅ Data: 03/02/2023
✅ Tamanhos: G: 10
✅ Quantidade: 10 unidades
✅ Valor unitário: R$ 54,00
✅ Valor Total: R$ 540,00
✅ Descrição: Camiseta feminina personalizada.
✅ Status: Inserido e verificado no Supabase

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0016 - FILTROS EQUIPAMENTO LABORATÓRIO POLIMIX
✅ Cliente: POLIMIX CONCRETO LTDA (CNPJ: 29.067.113/0001-96)
✅ Produto: FLT001 - FILTRO EQUIPAMENTO LABORATÓRIO
✅ Data: 09/02/2023
✅ Quantidade: 2 unidades
✅ Valor unitário: R$ 75,00
✅ Valor Total: R$ 150,00
✅ Descrição: Filtro em Nylon 210 para equipamento de laboratório.
✅ Status: Inserido e verificado no Supabase

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0017 - UNIFORME SANTEC
✅ Cliente: SANTEC (CNPJ: 25.195.283/0001-03)
✅ Data: 22/02/2023
✅ Produto 1: P0014 - CAMISA OPERACIONAL ABERTA BRIM
Tamanhos: M: 14, G: 11, GG: 3, G2: 1 = 29 unidades
Tecido: BRIM LEVE - Cor PETRÓLEO
✅ Produto 2: P0015 - CALÇA OPERACIONAL BRIM
Tamanhos: M: 15, G: 10, GG: 3, G2: 1 = 29 unidades
Tecido: BRIM PESADO - Cor PETRÓLEO
✅ Quantidade Total: 58 peças
✅ Valor Unitário: R$ 75,00 (por peça)
✅ Valor Total: R$ 4.350,00
✅ Descrição: Uniforme profissional com faixas refletivas e bordado SANTEC, cor Petróleo.
🔄 Status: Aguardando autorização para inserção no Supabase

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0018 - UNIFORME PAIS E FILHOS
✅ Cliente: PAI E FILHOS REFORMAS E MANUTENÇÕES (CNPJ: 20.493.435/0001-22)
❌ Data: 01/04/2023 (estimada)
✅ Produto 1: P0008 - CAMISA OPERACIONAL ABERTA BRIM
Tamanhos: M: 3, G: 6, GG: 2 = 11 unidades
Tecido: BRIM LEVE - Cor AZUL ROYAL
Valor unitário: R$ 75,00 (conforme base de dados)
✅ Produto 2: P0002 - CALÇA OPERACIONAL BRIM
Tamanhos: M: 3, G: 6, GG: 2 = 11 unidades
Tecido: BRIM PESADO - Cor AZUL ROYAL
Valor unitário: R$ 63,00 (conforme base de dados)
✅ Quantidade Total: 22 peças (11 camisas + 11 calças)
✅ Valor Total: R$ 1.518,00 (calculado: (11 * 75) + (11 * 63))
🔄 Status: Aguardando autorização

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0020 - CAMISETA EREP MIZU 2023
✅ Cliente: MIZU CIMENTOS (CNPJ: 29.067.113/0139-21)
✅ Produto: P0001 - CAMISETA
✅ Data: 05/05/2023 (conforme NF)
✅ Tamanhos: P: 4, M: 10, G: 28, GG: 10, G2: 1
✅ Quantidade: 52 unidades
✅ Valor unitário: R$ 38,87
✅ Valor Total: R$ 2.021,24
✅ Descrição: CAMISETA GOLA REDONDA MANGA CURTA MALHA PV, COR BRANCA COM LOGO EM SERIGRAFIA NO PEITO.
🔄 Status: Aguardando autorização

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0021 - CAMISETA MECÂNICA CIDÃO
✅ Cliente: CIDÃO MECÂNICA
✅ Produto: P0001 - CAMISETA
❌ Data: 25/06/2023 (estimada)
✅ Tamanhos: G1: 12
✅ Quantidade: 12 unidades
❌ Valor unitário: R$ 38,00 (estimado)
❌ Valor Total: R$ 456,00 (calculado)
✅ Descrição: CAMISETA TRADICIONAL em MALHA PV, cor GRAFITE, com estampa no peito esquerdo e costas.
🔄 Status: Aguardando autorização

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0022 - UNIFORME PAI E FILHOS (BRIM E POLO)
✅ Cliente: PAI E FILHOS REFORMAS E MANUTENÇÕES (CNPJ: 20.493.435/0001-22)
❌ Data: 01/08/2023 (estimada)
✅ Produto 1: P0008 - CAMISA OPERACIONAL ABERTA BRIM
Tamanhos: M: 4, G: 6, GG: 1 = 11 unidades
Descrição: Camisa em Brim Leve, cor AZUL ROYAL, com estampa no bolso do peito.
Valor unitário: R$ 75,00 (conforme base de dados)
✅ Produto 2: P0002 - CALÇA OPERACIONAL BRIM
Tamanhos: M: 4, G: 6, GG: 1 = 11 unidades
Descrição: Calça em Brim Pesado, cor AZUL ROYAL, com estampa no bolso esquerdo.
Valor unitário: R$ 63,00 (conforme base de dados)
✅ Produto 3: P0003 - CAMISA POLO
Tamanhos: GG: 2 = 2 unidades
Descrição: Camisa Polo em Malha Piquet, cor AZUL MARINHO, com estampa no bolso esquerdo.
Valor unitário: R$ 44,90 (conforme base de dados)
✅ Quantidade Total: 24 peças
✅ Valor Total: R$ 1.607,80 (calculado)
🔄 Status: Aguardando autorização

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0023 - UNIFORMES TLS
✅ Cliente: TLS SERVICOS INDUSTRIAIS LTDA (CNPJ: 43.226.692/0001-01)
✅ Data: 13/07/2023
✅ Produto 1: P0006 - JAQUETA DE NYLON
Tamanhos: G: 1, GG: 2 = 3 unidades
Descrição: Jaqueta em Nylon 210, cor PRETO, com bordado no peito e costas.
Valor unitário: R$ 180,00
✅ Produto 2: P0018 - BLUSA MOLETOM
Tamanhos: M: 1, G: 5, GG: 5 = 11 unidades
Descrição: Moletom com capuz em Moletom PA, cor PRETO, com bordado no peito e costas.
Valor unitário: R$ 95,00
❌ Produto 3: MACACÃO INDUSTRIAL - a criar
Tamanhos: Não especificado na Ficha Técnica para as 2 unidades da NF.
Quantidade: 2 unidades
Descrição: Macacão em Brim Pesado, cor VERDE BANDEIRA, com bordados e faixa refletiva.
Valor unitário: R$ 200,00
✅ Quantidade Total: 16 peças
✅ Valor Total: R$ 1.985,00
⚠️ Observação: A Ficha Técnica do Macacão lista 4 peças, mas a Nota Fiscal fatura apenas 2. Os tamanhos para estas 2 peças não foram especificados.
🔄 Status: Aguardando autorização

"_________________________________________________________________________________________________________________"
📄 ORÇAMENTO #0024 - CAMISETA SIPAT MIZU 2023
✅ Cliente: MIZU CIMENTOS (CNPJ: 29.067.113/0139-21)
✅ Produto: P0001 - CAMISETA
✅ Data: 10/07/2023 (conforme NF)
✅ Tamanhos: P: 4, M: 10, G: 28, GG: 13, G2: 1 (conforme Ficha Técnica)
✅ Quantidade: 50 unidades (conforme NF)
✅ Valor unitário: R$ 38,87
✅ Valor Total: R$ 1.943,50
✅ Descrição: CAMISETA GOLA REDONDA em MALHA PV, cor BRANCO, com estampa no peito esquerdo e nas costas para o evento SIPAT MIZU 2023.
⚠️ Observação: A quantidade faturada (50) é diferente da soma dos tamanhos na Ficha Técnica (53). A lista de tamanhos pode precisar de ajuste antes da inserção.
🔄 Status: Aguardando autorização


📄 ORÇAMENTO #0025 - CAMISETA EREP 2023 ECOMIX
✅ Cliente: ECOMIX ARGAMASSAS LTDA (CNPJ: 10.914.634/0007-07)
✅ Produto: P0001 - CAMISETA
✅ Data: 06/07/2023 (conforme NF)
✅ Tamanhos: P: 5, M: 41, G: 33, GG: 14, G1: 3, G2: 4
✅ Quantidade: 100 unidades
✅ Valor unitário: R$ 36,92
✅ Valor Total: R$ 3.692,00
✅ Descrição: CAMISETA GOLA REDONDA MANGA CURTA MALHA PV, COR BRANCA COM LOGO EM SERIGRAFIA NO PEITO.
🔄 Status: Aguardando autorização


📄 ORÇAMENTO #0026 - CAMISETA DIA DO MOTORISTA MIZU
✅ Cliente: POLIMIX CONCRETO LTDA (CNPJ: 29.067.113/0052-36)
✅ Produto: P0001 - CAMISETA
✅ Data: 19/07/2023 (conforme NF)
✅ Tamanhos: P: 4, M: 15, G: 60, GG: 50, G2: 3 (conforme Ficha Técnica)
✅ Quantidade: 130 unidades (conforme NF)
✅ Valor unitário: R$ 34,90
✅ Valor Total: R$ 4.537,00
✅ Descrição: CAMISETA GOLA REDONDA MANGA CURTA MALHA POLIÉSTER, COR BRANCA COM ESTAMPA EM SUBLIMAÇÃO NO PEITO.
⚠️ Observação: A quantidade faturada (130) é diferente da soma dos tamanhos na Ficha Técnica (132). A grade de tamanhos pode precisar de ajuste.
🔄 Status: Aguardando autorização


📄 ORÇAMENTO #0029 - CAMISETA DIA DO MOTORISTA MIZU
✅ Cliente: MIZU CIMENTOS (CNPJ: 29.067.113/0139-21)
✅ Produto: P0001 - CAMISETA
✅ Data: 19/07/2023 (conforme NF)
✅ Tamanhos: P: 4, M: 15, G: 60, GG: 50, G2: 3 (conforme Ficha Técnica)
✅ Quantidade: 130 unidades (conforme NF)
✅ Valor unitário: R$ 34,90
✅ Valor Total: R$ 4.537,00
✅ Descrição: CAMISETA GOLA REDONDA MANGA CURTA MALHA POLIÉSTER, COR BRANCA COM ESTAMPA EM SUBLIMAÇÃO NO PEITO.
⚠️ Observação: A quantidade faturada (130) é diferente da soma dos tamanhos na Ficha Técnica (132). A grade de tamanhos pode precisar de ajuste.
🔄 Status: Aguardando autorização


📄 ORÇAMENTO #0031 - JAQUETA AUPAV
❌ Cliente: Vigent Construções LTDA (CNPJ: 15.320.722/0001-09) - a criar
✅ Produto: P0006 - JAQUETA DE NYLON
✅ Data: 21/08/2023 (data da segunda NF)
✅ Tamanhos: P: 1, M: 5, G: 10, GG: 2, G1: 1
✅ Quantidade: 19 unidades (10 + 9)
✅ Valor unitário: R$ 200,00
✅ Valor Total: R$ 3.800,00
✅ Descrição: JAQUETA NYLON 210 RESINADO com forro MATELASSÊ, cor AZUL MARINHO. Possui bordado nas costas, faixa refletiva de 5cm, punho elástico e bolso embutido.
🔄 Status: Aguardando autorização

---

## 📄 ORÇAMENTO #0034 - CAMISETA POLIMIX 40 ANOS
- ✅ **Cliente**: POLIMIX CONCRETO LTDA (CNPJ: 29.067.113/0094-95)
- ✅ **Produto**: P0001 - CAMISETA
- ✅ **Data**: 28/10/2023 (conforme NF)
- ✅ **Tamanhos**: P: 12, M: 17, G: 58, GG: 16, G1: 3, G3: 4
- ✅ **Quantidade**: 110 unidades
- ✅ **Valor unitário**: R$ 37,90
- ✅ **Valor Total**: R$ 4.169,00
- ✅ **Descrição**: CAMISETA POLIMIX AGREGADOS 40 ANOS, MALHA DE ALGODÃO OU MALHA PA, COR: BRANCO, ESTAMPA: PEITO ESQUERDO COM 3 CORES, BORDADO: MANGAS DIREITA E ESQUERDA 3 CORES.
- 🔄 **Status**: Aguardando autorização

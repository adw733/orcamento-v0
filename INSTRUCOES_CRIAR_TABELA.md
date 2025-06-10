# 🗄️ CRIAR TABELA TIPOS_TAMANHO NO SUPABASE

## 📋 INSTRUÇÕES PASSO A PASSO

### 1. Acesse o Painel do Supabase
- URL: https://fpejkwmapomxfyxmxqrd.supabase.co/project/fpejkwmapomxfyxmxqrd
- Faça login se necessário

### 2. Abra o SQL Editor
- No menu lateral esquerdo, clique em **"SQL Editor"**
- Ou vá em **Table Editor** > **New table** > **SQL**

### 3. Execute o SQL
- Abra o arquivo: `scripts/create_tipos_tamanho_table.sql`
- **Copie TODO o conteúdo do arquivo**
- **Cole no SQL Editor do Supabase**
- Clique em **"Run"** ou **"Execute"**

### 4. Verifique o Resultado
Você deve ver uma saída similar a:
```
✅ Tabela criada com sucesso!
✅ total_tipos: 3
✅ INFANTIL: 14 tamanhos
✅ NUMÉRICO: 12 tamanhos  
✅ PADRÃO: 12 tamanhos
```

### 5. Teste a Funcionalidade
- Volte para o aplicativo
- Execute: `node scripts/create-table-direct.js`
- Deve mostrar: "🎉 Tabela tipos_tamanho está pronta para uso!"

## 🔧 O QUE A TABELA FAZ

A tabela `tipos_tamanho` armazena:
- **nome**: Nome do tipo (ex: "PADRÃO", "NUMÉRICO", "INFANTIL")
- **descricao**: Descrição detalhada
- **tamanhos**: Array com os tamanhos disponíveis (ex: ["PP", "P", "M", "G"])

## 📊 DADOS PADRÃO INSERIDOS

1. **PADRÃO**: PP, P, M, G, GG, G1, G2, G3, G4, G5, G6, G7
2. **NUMÉRICO**: 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58
3. **INFANTIL**: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13

## ⚠️ IMPORTANTE

- A tabela tem **constraint UNIQUE** no campo `nome` (evita duplicatas)
- **RLS (Row Level Security)** está habilitado
- **Política permite todas as operações** (ajustar se necessário)
- **Indices criados** para melhor performance

## 🆘 SE DER ERRO

1. Verifique se você tem permissões de administrador no projeto
2. Se erro de permissão, ajuste as políticas RLS
3. Se tabela já existir, o script vai apenas inserir dados faltantes
4. Execute `node scripts/create-table-direct.js` para diagnóstico
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a budget/quote generator application ("Gerador de Orçamento") for uniform manufacturing. Built with Next.js 15, React 19, TypeScript, and Supabase.

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run linting

## Architecture

### Data Flow & State Management

The application uses a centralized state management pattern in `components/gerador-orcamento.tsx`:
- Main component manages global state (clients, products, budgets, company data)
- Tab-based navigation system controlled by URL hash (`#orcamentos`, `#orcamento`, etc.)
- Client-side routing managed through `app/client-page.tsx` wrapper

### Core Data Entities

Located in `types/types.ts`:
- **Cliente** - Client with sequential code (C0001, C0002...)
- **Produto** - Product with sequential code (P0001, P0002...), categories, fabrics, colors, sizes
- **Orcamento** - Quote/budget with items, client info, payment terms, delivery dates
- **ItemOrcamento** - Quote line items with product, quantity, unit price, fabrics, colors, sizes, stamps
- **DadosEmpresa** - Company data (name, CNPJ, logo, etc.)

### Database Layer

**Supabase Client**: `lib/supabase.ts`
- Singleton client with fallback for missing credentials
- Type-safe with `types/supabase.ts` database types

**Service Functions**: `lib/services.ts`
- `obterProximoCodigoCliente()` - Generates next sequential client code
- `atualizarCodigosProdutos()` - Batch updates product codes

**Materials Service**: `lib/services-materiais.ts`

### Component Structure

**Main Components** (in `components/`):
- `gerador-orcamento.tsx` - Root orchestrator, manages all state and tabs
- `formulario-orcamento.tsx` - Quote form with items, client selection
- `visualizacao-documento.tsx` - Quote preview/PDF generation
- `lista-orcamentos.tsx` - List all saved quotes
- `gerenciador-*.tsx` - CRUD managers for clients, products, categories, materials, company data, expenses/revenues
- `dashboard-financeiro.tsx` - Financial dashboard with DRE (income statement)
- `app-sidebar.tsx` - Navigation sidebar
- `assistente-ia.tsx` - AI assistant integration

**UI Components**: `components/ui/` - shadcn/ui components

### PDF Generation

- **Client-side**: Uses html2canvas + jsPDF via `lib/pdf-utils.ts`
- **Server-side**: API route at `app/api/export-pdf/route.ts` using Puppeteer + Chromium for professional PDFs

### Routing

- `/` - Main quote generator (redirects to `/#orcamentos`)
- `/dashboard` - Financial dashboard page
- `/#[tab]` - Client-side hash routing for different sections

### Path Aliases

Uses `@/*` for root-level imports (configured in `tsconfig.json`)

## Key Features

1. **Quote Management**: Create, edit, save, archive quotes
2. **Product Catalog**: Manage products with fabrics, colors, sizes, categories, stamps
3. **Client Management**: Sequential client codes, full CRUD
4. **PDF Export**: Dual-mode (quick client-side, professional server-side)
5. **Financial Tracking**: Expenses, revenues, DRE analysis
6. **AI Assistant**: Integration with Google Gemini for product suggestions
7. **Multi-size Support**: Custom size types and distributions per product

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Important Notes

- Build ignores TypeScript and ESLint errors (configured in `next.config.mjs`)
- Images are unoptimized
- Puppeteer packages are externalized for serverless deployment
- Application uses client-side rendering extensively (`"use client"` directives)
- Sequential code generation for clients/products requires Supabase connectivity

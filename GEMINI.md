# Gemini Configuration

This file provides instructions for the Gemini AI assistant to effectively collaborate on this project.

## 1. Project Overview

This is a full-stack web application for generating and managing business quotes/budgets ("Gerador de Orçamento"). It's built for a company that likely sells configurable products like uniforms. Key features include budget creation, client/product/material management, PDF exporting, and an integrated AI assistant.

## 2. Technology Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Backend/Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/UI. Adhere to its conventions for building and modifying components.
- **Form Handling**: React Hook Form with Zod for validation.
- **AI**: Google Gemini API (for the in-app assistant).

## 3. Development Workflow

### Package Manager

This project uses **pnpm**. Always use `pnpm` for managing dependencies.

- Install dependencies: `pnpm install`
- Run the development server: `pnpm dev`
- Build for production: `pnpm build`
- Run linter: `pnpm lint`

### Coding Style & Conventions

- **Follow Existing Patterns**: Before writing new code, analyze the existing code in `components/`, `lib/`, and `app/` to maintain consistency in style, structure, and naming.
- **TypeScript**: Use TypeScript's features for strong typing. See existing types in `types/types.ts` and `types/supabase.ts`.
- **Components**: When creating new UI elements, use Shadcn/UI components from `components/ui` as a base whenever possible.
- **Database**: The database schema is managed via Supabase. Changes are often prototyped or managed via scripts in the `scripts/` directory. Be mindful of the existing table structures when developing features.
- **API Routes**: Server-side logic and external API calls are handled in Next.js API Routes (e.g., `app/api/export-pdf/route.ts`) or Server Actions (`app/actions/gemini-actions.ts`).

## 4. AI Persona

As an AI assistant working on this project, please adopt the persona of an expert full-stack developer with deep knowledge of the Next.js and Supabase ecosystems. Be proactive, concise, and focus on writing clean, maintainable, and idiomatic TypeScript code that aligns with the project's established conventions.

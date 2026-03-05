import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Gerador de Orçamento",
  description: "Aplicativo para geração de orçamentos de uniformes",
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Redirect to the new dashboard route
  redirect("/orcamentos")
}

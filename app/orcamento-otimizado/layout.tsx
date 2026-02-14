import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OrcamentoOtimizadoClientLayout } from "./client-layout"

export default async function OrcamentoOtimizadoLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    return <OrcamentoOtimizadoClientLayout>{children}</OrcamentoOtimizadoClientLayout>
}

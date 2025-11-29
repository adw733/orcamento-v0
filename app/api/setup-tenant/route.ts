import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { companyName } = await request.json()

        if (!companyName || companyName.trim().length === 0) {
            return NextResponse.json(
                { error: 'Nome da empresa é obrigatório' },
                { status: 400 }
            )
        }

        // Get current user from session
        const supabase = await createServerClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            return NextResponse.json(
                { error: 'Usuário não autenticado' },
                { status: 401 }
            )
        }

        // Check if user already has a tenant_id
        if (user.app_metadata?.tenant_id) {
            return NextResponse.json(
                { error: 'Usuário já possui uma empresa configurada' },
                { status: 400 }
            )
        }

        // Generate new tenant_id
        const tenantId = crypto.randomUUID()

        // Use service role to update app_metadata (requires SUPABASE_SERVICE_ROLE_KEY)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            {
                app_metadata: {
                    tenant_id: tenantId,
                    company_name: companyName.trim()
                }
            }
        )

        if (updateError) {
            console.error('Error updating user metadata:', updateError)
            return NextResponse.json(
                { error: 'Erro ao configurar empresa' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            tenantId,
            companyName: companyName.trim()
        })

    } catch (error) {
        console.error('Setup tenant error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}

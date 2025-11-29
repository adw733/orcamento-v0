import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Cliente admin com Service Role Key
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada')
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Cliente autenticado
async function getAuthClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getAuthClient()
    
    // Verificar se usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: 'Usuário sem tenant associado' }, { status: 403 })
    }
    
    const body = await request.json()
    const { userId, newPassword } = body
    
    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'userId e newPassword são obrigatórios' }, { status: 400 })
    }
    
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 })
    }
    
    // Usar cliente admin para resetar senha
    const adminClient = getAdminClient()
    
    // Verificar se o usuário pertence ao mesmo tenant
    const { data: targetUser } = await adminClient.auth.admin.getUserById(userId)
    
    if (!targetUser?.user || targetUser.user.app_metadata?.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Usuário não encontrado ou não pertence à sua empresa' }, { status: 404 })
    }
    
    // Resetar a senha
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword
    })
    
    if (updateError) {
      console.error('Erro ao resetar senha:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro na API de reset de senha:', error)
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 })
  }
}

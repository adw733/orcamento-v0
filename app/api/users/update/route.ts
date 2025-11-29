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

export async function PUT(request: NextRequest) {
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
    const { userId, nome, role, cargo, email } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }
    
    // Usar cliente admin para atualizar usuário
    const adminClient = getAdminClient()
    
    // Verificar se o usuário pertence ao mesmo tenant
    const { data: targetUser } = await adminClient.auth.admin.getUserById(userId)
    
    if (!targetUser?.user || targetUser.user.app_metadata?.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Usuário não encontrado ou não pertence à sua empresa' }, { status: 404 })
    }
    
    // Atualizar o usuário no Auth
    const updateData: any = {}
    
    // Atualizar email se fornecido
    if (email !== undefined && email !== targetUser.user.email) {
      updateData.email = email
    }
    
    // Atualizar user_metadata (nome, cargo, full_name)
    if (nome !== undefined || cargo !== undefined) {
      const newNome = nome !== undefined ? nome : targetUser.user.user_metadata?.nome
      updateData.user_metadata = {
        ...targetUser.user.user_metadata,
        nome: newNome,
        full_name: newNome, // Manter sincronizado com nome
        ...(cargo !== undefined && { cargo })
      }
    }
    
    // Atualizar app_metadata (role)
    if (role !== undefined) {
      updateData.app_metadata = {
        ...targetUser.user.app_metadata,
        role
      }
    }
    
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, updateData)
      
      if (updateError) {
        console.error('Erro ao atualizar usuário:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro na API de atualização:', error)
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 })
  }
}

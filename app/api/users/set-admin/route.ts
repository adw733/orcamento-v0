import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

// POST - Definir usuário como admin (use apenas para configuração inicial)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body
    
    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }
    
    const adminClient = getAdminClient()
    
    // Buscar usuário pelo email
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers()
    
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }
    
    const targetUser = users.users.find(u => u.email === email)
    
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    
    // Atualizar para admin
    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUser.id, {
      app_metadata: {
        ...targetUser.app_metadata,
        role: 'admin'
      }
    })
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Usuário ${email} agora é administrador` 
    })
  } catch (error: any) {
    console.error('Erro ao definir admin:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

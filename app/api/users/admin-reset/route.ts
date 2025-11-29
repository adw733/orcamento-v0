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

// POST - Resetar senha de usuário (use apenas para configuração inicial)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, newPassword } = body
    
    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email e nova senha são obrigatórios' }, { status: 400 })
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
    
    // Resetar senha
    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUser.id, {
      password: newPassword
    })
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Senha do usuário ${email} foi resetada` 
    })
  } catch (error: any) {
    console.error('Erro ao resetar senha:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

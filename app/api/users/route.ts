"use server"

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Cliente admin com Service Role Key (server-side only)
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada. Configure no .env.local')
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Cliente autenticado para verificar permissões
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

// GET - Listar usuários do tenant
export async function GET(request: NextRequest) {
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
    
    // Usar admin client para listar todos os usuários do Auth
    const adminClient = getAdminClient()
    
    // Buscar todos os usuários do Auth
    const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers({
      perPage: 1000
    })
    
    if (listError) {
      console.error('Erro ao listar usuários:', listError)
      return NextResponse.json({ error: 'Erro ao listar usuários' }, { status: 500 })
    }
    
    // Filtrar apenas usuários do mesmo tenant
    const tenantUsers = authUsers.users
      .filter(u => u.app_metadata?.tenant_id === tenantId)
      .map(u => {
        // Buscar nome de várias fontes possíveis
        const nome = u.user_metadata?.nome 
          || u.user_metadata?.full_name 
          || u.user_metadata?.name
          || u.email?.split('@')[0] 
          || ''
        
        return {
          id: u.id,
          user_id: u.id,
          email: u.email || '',
          nome: nome,
          role: u.app_metadata?.role || 'user',
          cargo: u.user_metadata?.cargo || '',
          status: u.email_confirmed_at ? 'active' : 'pending',
          created_at: u.created_at,
          last_sign_in: u.last_sign_in_at
        }
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    return NextResponse.json({ users: tenantUsers })
  } catch (error) {
    console.error('Erro na API de usuários:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar novo usuário para o tenant
export async function POST(request: NextRequest) {
  try {
    const supabase = await getAuthClient()
    
    // Verificar se usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const tenantId = user.app_metadata?.tenant_id
    const companyName = user.app_metadata?.company_name
    if (!tenantId) {
      return NextResponse.json({ error: 'Usuário sem tenant associado' }, { status: 403 })
    }
    
    const body = await request.json()
    const { email, password, nome, role, cargo } = body
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }
    
    // Usar cliente admin para criar usuário
    const adminClient = getAdminClient()
    
    // Criar usuário no Supabase Auth
    const displayName = nome || email.split('@')[0]
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automaticamente
      app_metadata: {
        tenant_id: tenantId,
        company_name: companyName,
        role: role || 'user'
      },
      user_metadata: {
        nome: displayName,
        full_name: displayName, // Campo padrão do Supabase
        cargo: cargo || ''
      }
    })
    
    // Atualizar o display_name separadamente (campo raw_user_meta_data)
    if (newUser?.user) {
      await adminClient.auth.admin.updateUserById(newUser.user.id, {
        user_metadata: {
          nome: displayName,
          full_name: displayName,
          cargo: cargo || ''
        }
      })
    }
    
    if (createError) {
      console.error('Erro ao criar usuário:', createError)
      
      if (createError.message.includes('already registered')) {
        return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 400 })
      }
      
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }
    
    // Registrar na tabela tenant_users
    const { error: insertError } = await supabase
      .from('tenant_users')
      .insert({
        tenant_id: tenantId,
        user_id: newUser.user.id,
        email: email,
        nome: nome || email.split('@')[0],
        role: 'user',
        status: 'active'
      })
    
    if (insertError) {
      console.error('Erro ao registrar usuário no tenant:', insertError)
      // Não falhar se a tabela não existir ainda
    }
    
    return NextResponse.json({ 
      success: true, 
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        nome: nome || email.split('@')[0]
      }
    })
  } catch (error: any) {
    console.error('Erro na API de usuários:', error)
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Remover usuário do tenant
export async function DELETE(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }
    
    // Não permitir deletar a si mesmo
    if (userId === user.id) {
      return NextResponse.json({ error: 'Você não pode remover a si mesmo' }, { status: 400 })
    }
    
    // Usar cliente admin para deletar usuário
    const adminClient = getAdminClient()
    
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error('Erro ao deletar usuário:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }
    
    // Remover da tabela tenant_users
    await supabase
      .from('tenant_users')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro na API de usuários:', error)
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 })
  }
}

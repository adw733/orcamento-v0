import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    console.log('[Middleware] Path:', request.nextUrl.pathname)
    
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    const cookies = request.cookies.getAll()
                    console.log('[Middleware] Cookies:', cookies.map(c => c.name))
                    return cookies
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Do not run Supabase code to check for session if we are on a public path
    // to avoid unnecessary database calls or redirects loop if not careful.
    // However, we need to refresh session if it exists.

    const {
        data: { user },
    } = await supabase.auth.getUser()
    
    console.log('[Middleware] User:', user?.email || 'none', 'tenant_id:', user?.app_metadata?.tenant_id || 'none')

    const isPublicPath = 
        request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/reset-password') ||
        request.nextUrl.pathname.startsWith('/auth') ||
        request.nextUrl.pathname.startsWith('/api') ||
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.includes('.') // static files

    const isSetupPath = request.nextUrl.pathname.startsWith('/setup')

    // Not logged in - redirect to login (except public paths)
    if (!user && !isPublicPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Logged in but no tenant_id - redirect to setup (except setup and public paths)
    if (user && !user.app_metadata?.tenant_id && !isSetupPath && !isPublicPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/setup'
        return NextResponse.redirect(url)
    }

    // Has tenant_id but trying to access setup - redirect to home
    if (user && user.app_metadata?.tenant_id && isSetupPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

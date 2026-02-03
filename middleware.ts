import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
    // Middleware desabilitado devido a problema com fetch no Edge Runtime do Next.js 15
    // O login funciona normalmente via client-side auth
    // TODO: Migrar para Node.js runtime quando Next.js suportar ou usar outra estratégia
    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, LogOut, User, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface UserMenuProps {
    expanded?: boolean
}

export function UserMenu({ expanded = true }: UserMenuProps) {
    const { user, companyName, isLoading } = useCurrentUser()
    const [isSigningOut, setIsSigningOut] = useState(false)
    const router = useRouter()

    const handleSignOut = async () => {
        setIsSigningOut(true)
        try {
            const supabase = createClient()
            await supabase.auth.signOut()
            
            // Clear any cached data
            if (typeof window !== 'undefined') {
                localStorage.clear()
                sessionStorage.clear()
            }
            
            toast.success('Logout realizado com sucesso')
            router.push('/login')
            router.refresh()
        } catch (error) {
            console.error('Error signing out:', error)
            toast.error('Erro ao fazer logout')
        } finally {
            setIsSigningOut(false)
        }
    }

    if (isLoading) {
        return (
            <div className={`flex items-center ${expanded ? 'gap-2 px-3 py-2' : 'justify-center p-2'}`}>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!user) {
        return null
    }

    const displayName = companyName || user.email?.split('@')[0] || 'Usuário'
    const initials = displayName.substring(0, 2).toUpperCase()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    className={`w-full ${expanded ? 'justify-start gap-3 px-3' : 'justify-center px-0'} h-auto py-2`}
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">
                        {initials}
                    </div>
                    {expanded && (
                        <div className="flex flex-col items-start text-left min-w-0">
                            <span className="text-sm font-medium truncate max-w-[140px]">
                                {displayName}
                            </span>
                            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                                {user.email}
                            </span>
                        </div>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {companyName && (
                    <>
                        <DropdownMenuItem disabled>
                            <Building2 className="mr-2 h-4 w-4" />
                            <span>{companyName}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}
                <DropdownMenuItem 
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="text-destructive focus:text-destructive"
                >
                    {isSigningOut ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <LogOut className="mr-2 h-4 w-4" />
                    )}
                    <span>Sair</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

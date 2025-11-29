'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Building2, Loader2 } from 'lucide-react'

export default function SetupPage() {
    const [companyName, setCompanyName] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!companyName.trim()) {
            toast.error('Digite o nome da empresa')
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/setup-tenant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ companyName: companyName.trim() }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao configurar empresa')
            }

            toast.success('Empresa configurada com sucesso!')
            
            // Force a hard refresh to get new session with tenant_id
            window.location.href = '/'

        } catch (error) {
            console.error('Setup error:', error)
            toast.error(error instanceof Error ? error.message : 'Erro ao configurar empresa')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Configure sua empresa</CardTitle>
                <CardDescription>
                    Informe o nome da sua empresa para começar a usar o sistema
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="companyName" className="text-sm font-medium">
                            Nome da Empresa
                        </label>
                        <Input
                            id="companyName"
                            type="text"
                            placeholder="Ex: Minha Confecção Ltda"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Configurando...
                            </>
                        ) : (
                            'Começar'
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

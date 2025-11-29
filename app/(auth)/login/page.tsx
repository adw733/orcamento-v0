'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [resetMode, setResetMode] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                toast.error('Erro ao fazer login: ' + error.message)
                return
            }

            toast.success('Login realizado com sucesso!')
            router.push('/')
            router.refresh()
        } catch (error) {
            toast.error('Erro inesperado ao fazer login')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) {
            toast.error('Digite seu email para recuperar a senha')
            return
        }
        setLoading(true)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (error) {
                toast.error('Erro ao enviar email: ' + error.message)
                return
            }

            toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.')
            setResetMode(false)
        } catch (error) {
            toast.error('Erro inesperado ao enviar email')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (resetMode) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Recuperar Senha</CardTitle>
                    <CardDescription className="text-center">
                        Digite seu email para receber o link de recuperação
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <button
                        type="button"
                        onClick={() => setResetMode(false)}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        Voltar ao login
                    </button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl text-center">Login</CardTitle>
                <CardDescription className="text-center">
                    Entre na sua conta para continuar
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Senha</Label>
                            <button
                                type="button"
                                onClick={() => setResetMode(true)}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                Esqueci minha senha
                            </button>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

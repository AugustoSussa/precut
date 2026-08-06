'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Logo } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/field'

type Erros = { nome?: string; email?: string; senha?: string }

export default function CadastroPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erros, setErros] = useState<Erros>({})

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const e: Erros = {}
    if (!nome.trim()) e.nome = 'Informe seu nome.'
    if (!email.trim()) {
      e.email = 'Informe seu e-mail.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = 'Digite um e-mail válido.'
    }
    if (!senha.trim()) {
      e.senha = 'Crie uma senha.'
    } else if (senha.length < 6) {
      e.senha = 'A senha deve ter pelo menos 6 caracteres.'
    }
    setErros(e)
    if (Object.keys(e).length > 0) return
    router.push('/projetos')
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo />
          <p className="text-pretty text-sm text-muted-foreground">
            Crie sua conta para começar a extrair cortes com IA.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold text-foreground">Criar conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Leva menos de um minuto.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                autoComplete="name"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                aria-invalid={Boolean(erros.nome)}
              />
              <FieldError>{erros.nome}</FieldError>
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                aria-invalid={Boolean(erros.email)}
              />
              <FieldError>{erros.email}</FieldError>
            </div>
            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                aria-invalid={Boolean(erros.senha)}
              />
              <FieldError>{erros.senha}</FieldError>
            </div>
            <Button type="submit" size="lg" className="w-full">
              Criar conta
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}

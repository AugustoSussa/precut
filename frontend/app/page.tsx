'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await login(email, senha)
      // Pequena espera para garantir que o token foi gravado no localStorage
      await new Promise(r => setTimeout(r, 50))
      router.push('/projetos')
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-[#0F0F13] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-xl font-bold text-white">Précut</span>
          </div>
          <p className="text-sm text-[#6B6B80]">Edição de vídeo com análise por IA</p>
        </div>

        <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-2xl p-8">
          <h1 className="text-lg font-semibold text-white mb-1">Entrar</h1>
          <p className="text-sm text-[#6B6B80] mb-6">Bem-vindo de volta ao Précut.</p>

          {erro && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#E8E8F0] mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                required
                className="w-full px-3 py-2.5 bg-[#0F0F13] border border-[#2A2A38] rounded-lg text-sm text-white placeholder-[#6B6B80] focus:outline-none focus:border-[#7C3AED] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E8E8F0] mb-1.5">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 bg-[#0F0F13] border border-[#2A2A38] rounded-lg text-sm text-white placeholder-[#6B6B80] focus:outline-none focus:border-[#7C3AED] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={carregando}
              className="w-full py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 rounded-lg text-sm font-semibold text-white transition-colors"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[#6B6B80]">
          Ainda não tem conta?{' '}
          <Link href="/cadastro" className="text-[#A78BFA] hover:underline font-medium">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  )
}

'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cadastrar, login } from '@/lib/api'

export default function CadastroPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [aceite, setAceite] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!aceite) { setErro('Leia e aceite o aviso de privacidade'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem'); return }
    if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres'); return }
    setCarregando(true)
    try {
      await cadastrar(nome, email, senha, aceite)
      await login(email, senha)
      await new Promise(r => setTimeout(r, 50))
      router.push('/projetos')
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-[#0F0F13] px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-xl font-bold text-white">Précut</span>
          </div>
          <p className="text-sm text-[#6B6B80]">Crie sua conta gratuitamente</p>
        </div>

        <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-2xl p-8">
          <h1 className="text-lg font-semibold text-white mb-1">Criar conta</h1>
          <p className="text-sm text-[#6B6B80] mb-6">Comece a criar conteúdo com IA.</p>

          {erro && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Nome', value: nome, set: setNome, type: 'text', placeholder: 'Seu nome' },
              { label: 'E-mail', value: email, set: setEmail, type: 'email', placeholder: 'voce@exemplo.com' },
              { label: 'Senha', value: senha, set: setSenha, type: 'password', placeholder: '••••••••' },
              { label: 'Confirmar senha', value: confirmar, set: setConfirmar, type: 'password', placeholder: '••••••••' },
            ].map(({ label, value, set, type, placeholder }) => (
              <div key={label}>
                <label className="block text-sm font-medium text-[#E8E8F0] mb-1.5">{label}</label>
                <input
                  type={type}
                  value={value}
                  onChange={e => set(e.target.value)}
                  placeholder={placeholder}
                  required
                  className="w-full px-3 py-2.5 bg-[#0F0F13] border border-[#2A2A38] rounded-lg text-sm text-white placeholder-[#6B6B80] focus:outline-none focus:border-[#7C3AED] transition-colors"
                />
              </div>
            ))}
            <label className="flex items-start gap-2 text-xs text-[#A4A0BB] leading-relaxed">
              <input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)} className="mt-1 accent-[#7C3AED]" />
              <span>Li o aviso de privacidade e concordo com o processamento e armazenamento local dos vídeos, áudios, transcrições e resultados de IA que enviar. A análise textual poderá ser enviada à API OpenAI. Posso solicitar ao operador a remoção dos meus arquivos e dados. <a className="text-[#C4AEFF] underline" href="/privacidade" target="_blank" rel="noreferrer">Ler aviso completo</a>.</span>
            </label>
            <button
              type="submit"
              disabled={carregando}
              className="w-full py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 rounded-lg text-sm font-semibold text-white transition-colors"
            >
              {carregando ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[#6B6B80]">
          Já tem conta?{' '}
          <Link href="/" className="text-[#A78BFA] hover:underline font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}

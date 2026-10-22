'use client'

// Tela de listagem de projetos — equivalente ao livros_screen.dart do tutorial.
// Quatro estados explícitos: carregando, erro (com "Tentar de novo"), vazia, lista.
// Usa o projeto_service em vez de chamar a API diretamente.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FilmIcon, Plus, Clock, LogOut, Trash2, RefreshCw, CloudOff } from 'lucide-react'
import { removerToken, type ProjetoListagem } from '@/lib/api'
import * as ProjetoService from '@/lib/services/projeto_service'
import { ErroDeProjeto } from '@/lib/services/projeto_service'
import { formatarDuracao, formatarData, STATUS_LABEL, STATUS_COLOR } from '@/lib/utils'

// Os quatro estados da tela, como no tutorial (carregando/erro/vazia/lista)
type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'vazia' }
  | { tipo: 'lista'; projetos: ProjetoListagem[] }

export default function ProjetosPage() {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const [criando, setCriando] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [modalAberto, setModalAberto] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('precut_token')
    if (!token) {
      router.replace('/')
      return
    }
    carregar()
  }, [])

  // Pede a lista ao service. O service traduz qualquer falha em ErroDeProjeto.
  async function carregar() {
    setEstado({ tipo: 'carregando' })
    try {
      const data = await ProjetoService.listar()
      setEstado(data.length === 0 ? { tipo: 'vazia' } : { tipo: 'lista', projetos: data })
    } catch (e: any) {
      if (e instanceof ErroDeProjeto && e.message.includes('Sessão')) {
        router.replace('/')
        return
      }
      setEstado({ tipo: 'erro', mensagem: e.message || 'Erro desconhecido.' })
    }
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setCriando(true)
    try {
      const p = await ProjetoService.criar(titulo)
      router.push(`/projetos/${p.id}`)
    } catch (err: any) {
      alert(err.message)
      setCriando(false)
    }
  }

  async function handleApagar(id: number, e: React.MouseEvent) {
    e.preventDefault()
    if (!confirm('Apagar este projeto?')) return
    try {
      await ProjetoService.apagar(id)
      // Atualiza a lista local sem recarregar
      setEstado(prev => {
        if (prev.tipo !== 'lista') return prev
        const novos = prev.projetos.filter(p => p.id !== id)
        return novos.length === 0 ? { tipo: 'vazia' } : { tipo: 'lista', projetos: novos }
      })
    } catch (err: any) {
      alert(err.message)
    }
  }

  function sair() {
    removerToken()
    router.push('/')
  }

  // ── Corpo dos quatro estados ────────────────────────────────────────────────

  function renderCorpo() {
    // 1. Carregando
    if (estado.tipo === 'carregando') {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-[#6B6B80]">
          <RefreshCw className="w-8 h-8 animate-spin mb-3" />
          <p className="text-sm">Carregando projetos...</p>
        </div>
      )
    }

    // 2. Erro — com botão "Tentar de novo", como no tutorial
    if (estado.tipo === 'erro') {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CloudOff className="w-12 h-12 text-[#6B6B80] mb-4" />
          <h2 className="text-lg font-medium text-white mb-1">Não consegui carregar os projetos</h2>
          <p className="text-sm text-red-400 mb-5 max-w-sm">{estado.mensagem}</p>
          <button
            onClick={carregar}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg text-sm font-semibold text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar de novo
          </button>
        </div>
      )
    }

    // 3. Lista vazia
    if (estado.tipo === 'vazia') {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2A2A38] py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-[#1A1A24] flex items-center justify-center mb-4">
            <FilmIcon className="w-6 h-6 text-[#6B6B80]" />
          </div>
          <h2 className="text-lg font-medium text-white">Nenhum projeto ainda</h2>
          <p className="text-sm text-[#6B6B80] mt-1 max-w-xs">
            Crie seu primeiro projeto para começar a editar com IA.
          </p>
          <button
            onClick={() => setModalAberto(true)}
            className="mt-5 flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg text-sm font-semibold text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar primeiro projeto
          </button>
        </div>
      )
    }

    // 4. Lista
    return (
      <ul className="space-y-3">
        {estado.projetos.map(p => (
          <li key={p.id}>
            <Link
              href={`/projetos/${p.id}`}
              className="group flex items-center justify-between p-5 bg-[#1A1A24] border border-[#2A2A38] hover:border-[#7C3AED]/50 rounded-xl transition-colors"
            >
              <div className="min-w-0">
                <h2 className="font-medium text-white group-hover:text-[#A78BFA] transition-colors truncate">
                  {p.titulo}
                </h2>
                <div className="flex items-center gap-4 mt-1.5 text-sm text-[#6B6B80]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatarDuracao(p.duracao)}
                  </span>
                  <span>{formatarData(p.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[p.status] ?? ''}`}>
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
                <button
                  onClick={e => handleApagar(p.id, e)}
                  className="p-1.5 rounded-md text-[#6B6B80] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    )
  }

  const totalProjetos = estado.tipo === 'lista' ? estado.projetos.length : null

  return (
    <div className="min-h-dvh bg-[#0F0F13]">
      {/* Header */}
      <header className="border-b border-[#2A2A38] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#7C3AED] flex items-center justify-center">
            <span className="text-white font-bold text-xs">P</span>
          </div>
          <span className="font-bold text-white">Précut</span>
        </div>
        <button
          onClick={sair}
          className="flex items-center gap-1.5 text-sm text-[#6B6B80] hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">Meus projetos</h1>
            {totalProjetos !== null && (
              <p className="text-sm text-[#6B6B80] mt-1">
                {totalProjetos} {totalProjetos === 1 ? 'projeto' : 'projetos'}
              </p>
            )}
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg text-sm font-semibold text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo projeto
          </button>
        </div>

        {renderCorpo()}
      </main>

      {/* Modal novo projeto */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-white mb-4">Novo projeto</h2>
            <form onSubmit={handleCriar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#E8E8F0] mb-1.5">Título</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Aula de investimentos"
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 bg-[#0F0F13] border border-[#2A2A38] rounded-lg text-sm text-white placeholder-[#6B6B80] focus:outline-none focus:border-[#7C3AED] transition-colors"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="flex-1 py-2.5 border border-[#2A2A38] rounded-lg text-sm text-[#6B6B80] hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criando}
                  className="flex-1 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 rounded-lg text-sm font-semibold text-white transition-colors"
                >
                  {criando ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

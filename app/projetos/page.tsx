'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Clock, FilmIcon, Plus, Search, SearchX } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { StatusBadge, TipoBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/field'
import { useProjetos } from '@/components/projetos-provider'
import {
  STATUS,
  TIPOS,
  formatarData,
  formatarDuracao,
  type Projeto,
} from '@/lib/projetos'

export default function ListagemPage() {
  const { projetos } = useProjetos()
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return projetos.filter((p) => {
      const casaBusca = !termo || p.titulo.toLowerCase().includes(termo)
      const casaTipo = filtroTipo === 'todos' || p.tipo === filtroTipo
      const casaStatus =
        filtroStatus === 'todos' || p.status_processamento === filtroStatus
      return casaBusca && casaTipo && casaStatus
    })
  }, [projetos, busca, filtroTipo, filtroStatus])

  const semProjetos = projetos.length === 0
  const semResultados = !semProjetos && filtrados.length === 0

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Meus projetos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {projetos.length}{' '}
              {projetos.length === 1
                ? 'projeto de vídeo'
                : 'projetos de vídeo'}
            </p>
          </div>
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/projetos/novo" />}
          >
            <Plus className="size-4" />
            Novo projeto
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título…"
              className="pl-9"
              aria-label="Buscar por título"
            />
          </div>
          <Select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            aria-label="Filtrar por tipo"
            className="sm:w-44"
          >
            <option value="todos">Todos os tipos</option>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            aria-label="Filtrar por status"
            className="sm:w-48"
          >
            <option value="todos">Todos os status</option>
            {STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>

        {semProjetos ? (
          <EstadoVazio />
        ) : semResultados ? (
          <SemResultados />
        ) : (
          <ul className="mt-6 grid gap-3">
            {filtrados.map((projeto) => (
              <li key={projeto.id}>
                <ProjetoCard projeto={projeto} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

function ProjetoCard({ projeto }: { projeto: Projeto }) {
  return (
    <Link
      href={`/projetos/${projeto.id}`}
      className="group block rounded-xl border border-border bg-card p-4 shadow-xs transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 focus-visible:outline-none sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate font-medium text-foreground group-hover:text-primary">
            {projeto.titulo}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              <span className="font-mono">
                {formatarDuracao(projeto.duracao_min)}
              </span>
            </span>
            <span>Upload em {formatarData(projeto.data_upload)}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <TipoBadge tipo={projeto.tipo} />
          <StatusBadge status={projeto.status_processamento} />
        </div>
      </div>
    </Link>
  )
}

function EstadoVazio() {
  return (
    <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <FilmIcon className="size-6" />
      </div>
      <h2 className="mt-4 text-lg font-medium text-foreground">
        Nenhum projeto ainda
      </h2>
      <p className="mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
        Crie seu primeiro projeto para subir um vídeo longo e deixar a IA
        sugerir os melhores cortes.
      </p>
      <Button
        className="mt-6"
        size="lg"
        nativeButton={false}
        render={<Link href="/projetos/novo" />}
      >
        <Plus className="size-4" />
        Criar primeiro projeto
      </Button>
    </div>
  )
}

function SemResultados() {
  return (
    <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-6" />
      </div>
      <h2 className="mt-4 text-lg font-medium text-foreground">
        Nenhum resultado encontrado
      </h2>
      <p className="mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
        Tente ajustar a busca ou os filtros para encontrar seus projetos.
      </p>
    </div>
  )
}

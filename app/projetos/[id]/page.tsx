'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Calendar, Clock, Pencil, Trash2 } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { NaoEncontrado } from '@/components/nao-encontrado'
import { StatusBadge, TipoBadge } from '@/components/status-badge'
import { ConfirmarExclusao } from '@/components/confirmar-exclusao'
import { Button } from '@/components/ui/button'
import { useProjetos } from '@/components/projetos-provider'
import { formatarData, formatarDuracao } from '@/lib/projetos'

export default function DetalheProjetoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { getProjeto, excluirProjeto } = useProjetos()
  const projeto = getProjeto(params.id)
  const [confirmando, setConfirmando] = useState(false)

  function handleExcluir() {
    if (!projeto) return
    excluirProjeto(projeto.id)
    router.push('/projetos')
  }

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {projeto ? (
          <>
            <Link
              href="/projetos"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Voltar para projetos
            </Link>

            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <TipoBadge tipo={projeto.tipo} />
                  <StatusBadge status={projeto.status_processamento} />
                </div>
                <h1 className="mt-3 text-pretty text-2xl font-semibold tracking-tight text-foreground">
                  {projeto.titulo}
                </h1>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" />
                  Duração
                </div>
                <p className="mt-1 font-mono text-lg font-medium text-foreground">
                  {formatarDuracao(projeto.duracao_min)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="size-4" />
                  Data de upload
                </div>
                <p className="mt-1 text-lg font-medium text-foreground">
                  {formatarData(projeto.data_upload)}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                Observação
              </h2>
              <p className="mt-1 text-pretty leading-relaxed text-foreground">
                {projeto.observacao || (
                  <span className="text-muted-foreground">
                    Nenhuma observação registrada.
                  </span>
                )}
              </p>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
              <Button
                variant="destructive"
                size="lg"
                onClick={() => setConfirmando(true)}
              >
                <Trash2 className="size-4" />
                Excluir
              </Button>
              <Button
                variant="outline"
                size="lg"
                nativeButton={false}
                render={<Link href={`/projetos/${projeto.id}/editar`} />}
              >
                <Pencil className="size-4" />
                Editar
              </Button>
            </div>

            <ConfirmarExclusao
              aberto={confirmando}
              titulo={projeto.titulo}
              onCancelar={() => setConfirmando(false)}
              onConfirmar={handleExcluir}
            />
          </>
        ) : (
          <NaoEncontrado />
        )}
      </main>
    </div>
  )
}

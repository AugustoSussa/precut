'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { ProjetoForm } from '@/components/projeto-form'
import { NaoEncontrado } from '@/components/nao-encontrado'
import { useProjetos } from '@/components/projetos-provider'

export default function EditarProjetoPage() {
  const params = useParams<{ id: string }>()
  const { getProjeto } = useProjetos()
  const projeto = getProjeto(params.id)

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {projeto ? (
          <>
            <Link
              href={`/projetos/${projeto.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Voltar para o projeto
            </Link>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              Editar projeto
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Atualize as informações do projeto.
            </p>
            <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <ProjetoForm projeto={projeto} />
            </div>
          </>
        ) : (
          <NaoEncontrado />
        )}
      </main>
    </div>
  )
}

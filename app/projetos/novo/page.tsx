import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { ProjetoForm } from '@/components/projeto-form'

export default function NovoProjetoPage() {
  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href="/projetos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar para projetos
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
          Novo projeto
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha os dados do vídeo que você quer processar.
        </p>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <ProjetoForm />
        </div>
      </main>
    </div>
  )
}

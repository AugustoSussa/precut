import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NaoEncontrado() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileQuestion className="size-6" />
      </div>
      <h1 className="mt-4 text-lg font-medium text-foreground">
        Projeto não encontrado
      </h1>
      <p className="mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
        O projeto que você procura não existe ou pode ter sido excluído.
      </p>
      <Button
        className="mt-6"
        nativeButton={false}
        render={<Link href="/projetos" />}
      >
        Voltar para projetos
      </Button>
    </div>
  )
}

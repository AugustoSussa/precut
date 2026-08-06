import Link from 'next/link'
import { LogOut, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Scissors className="size-4" />
        </span>
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Précut
        </span>
      </span>
    </span>
  )
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/projetos" aria-label="Ir para meus projetos">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Olá, Ana Ribeiro
          </span>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/" />}
          >
            <LogOut className="size-3.5" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  )
}

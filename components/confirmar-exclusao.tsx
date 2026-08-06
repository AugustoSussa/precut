'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ConfirmarExclusao({
  aberto,
  titulo,
  onCancelar,
  onConfirmar,
}: {
  aberto: boolean
  titulo: string
  onCancelar: () => void
  onConfirmar: () => void
}) {
  useEffect(() => {
    if (!aberto) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancelar()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [aberto, onCancelar])

  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-exclusao"
    >
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onCancelar}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </div>
        <h2
          id="titulo-exclusao"
          className="mt-4 text-lg font-semibold text-foreground"
        >
          Excluir projeto
        </h2>
        <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">
          Tem certeza que deseja excluir{' '}
          <span className="font-medium text-foreground">
            &ldquo;{titulo}&rdquo;
          </span>
          ? Essa ação não pode ser desfeita.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" size="lg" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button variant="destructive" size="lg" onClick={onConfirmar}>
            Sim, excluir
          </Button>
        </div>
      </div>
    </div>
  )
}

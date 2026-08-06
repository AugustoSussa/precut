import { cn } from '@/lib/utils'
import {
  statusLabel,
  tipoLabel,
  type StatusProcessamento,
  type TipoProjeto,
} from '@/lib/projetos'

const statusStyles: Record<StatusProcessamento, string> = {
  aguardando: 'bg-muted text-muted-foreground',
  transcrevendo: 'bg-amber-100 text-amber-800',
  gerando_cortes: 'bg-blue-100 text-blue-800',
  concluido: 'bg-emerald-100 text-emerald-800',
}

const statusDot: Record<StatusProcessamento, string> = {
  aguardando: 'bg-muted-foreground/60',
  transcrevendo: 'bg-amber-500',
  gerando_cortes: 'bg-blue-500',
  concluido: 'bg-emerald-500',
}

export function StatusBadge({
  status,
  className,
}: {
  status: StatusProcessamento
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        statusStyles[status],
        className,
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          statusDot[status],
          status === 'transcrevendo' || status === 'gerando_cortes'
            ? 'animate-pulse'
            : '',
        )}
        aria-hidden="true"
      />
      {statusLabel(status)}
    </span>
  )
}

export function TipoBadge({
  tipo,
  className,
}: {
  tipo: TipoProjeto
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground',
        className,
      )}
    >
      {tipoLabel(tipo)}
    </span>
  )
}

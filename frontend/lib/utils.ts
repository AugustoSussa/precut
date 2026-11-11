export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatarDuracao(segundos: number | null): string {
  if (!segundos) return '--:--'
  const m = Math.floor(segundos / 60)
  const s = Math.floor(segundos % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  processando: 'Processando',
  pronto: 'Pronto',
  erro: 'Erro',
}

export const STATUS_COLOR: Record<string, string> = {
  pendente: 'text-yellow-400 bg-yellow-400/10',
  processando: 'text-blue-400 bg-blue-400/10',
  pronto: 'text-green-400 bg-green-400/10',
  erro: 'text-red-400 bg-red-400/10',
}

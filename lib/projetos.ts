export type TipoProjeto = 'entrevista' | 'evento' | 'live' | 'aula'

export type StatusProcessamento =
  | 'aguardando'
  | 'transcrevendo'
  | 'gerando_cortes'
  | 'concluido'

export interface Projeto {
  id: string
  titulo: string
  tipo: TipoProjeto
  data_upload: string // formato YYYY-MM-DD
  duracao_min: number
  status_processamento: StatusProcessamento
  observacao?: string
}

export const TIPOS: { value: TipoProjeto; label: string }[] = [
  { value: 'entrevista', label: 'Entrevista' },
  { value: 'evento', label: 'Evento' },
  { value: 'live', label: 'Live' },
  { value: 'aula', label: 'Aula' },
]

export const STATUS: { value: StatusProcessamento; label: string }[] = [
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'transcrevendo', label: 'Transcrevendo' },
  { value: 'gerando_cortes', label: 'Gerando cortes' },
  { value: 'concluido', label: 'Concluído' },
]

export function tipoLabel(tipo: TipoProjeto): string {
  return TIPOS.find((t) => t.value === tipo)?.label ?? tipo
}

export function statusLabel(status: StatusProcessamento): string {
  return STATUS.find((s) => s.value === status)?.label ?? status
}

export function formatarDuracao(min: number): string {
  if (min < 60) return `${min} min`
  const horas = Math.floor(min / 60)
  const restante = min % 60
  return restante === 0 ? `${horas} h` : `${horas} h ${restante} min`
}

export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  if (!ano || !mes || !dia) return iso
  return `${dia}/${mes}/${ano}`
}

export const PROJETOS_INICIAIS: Projeto[] = [
  {
    id: '1',
    titulo: 'Entrevista com a CEO da Nubank',
    tipo: 'entrevista',
    data_upload: '2026-07-28',
    duracao_min: 74,
    status_processamento: 'concluido',
    observacao:
      'Focar nos trechos sobre expansão internacional e cultura da empresa.',
  },
  {
    id: '2',
    titulo: 'Cobertura completa — TechSummit 2026',
    tipo: 'evento',
    data_upload: '2026-08-02',
    duracao_min: 213,
    status_processamento: 'gerando_cortes',
  },
  {
    id: '3',
    titulo: 'Live semanal de perguntas e respostas #42',
    tipo: 'live',
    data_upload: '2026-08-04',
    duracao_min: 118,
    status_processamento: 'transcrevendo',
    observacao: 'Cortar os melhores momentos das perguntas da audiência.',
  },
  {
    id: '4',
    titulo: 'Aula 01 — Fundamentos de edição não linear',
    tipo: 'aula',
    data_upload: '2026-08-05',
    duracao_min: 52,
    status_processamento: 'aguardando',
  },
  {
    id: '5',
    titulo: 'Entrevista com desenvolvedor sênior sobre IA local',
    tipo: 'entrevista',
    data_upload: '2026-07-19',
    duracao_min: 96,
    status_processamento: 'concluido',
    observacao: 'Destacar a parte sobre Ollama e Llama 3.',
  },
]

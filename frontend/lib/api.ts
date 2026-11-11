const BASE = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '')

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('precut_token')
}

export function salvarToken(token: string) {
  localStorage.setItem('precut_token', token)
}

export function removerToken() {
  localStorage.removeItem('precut_token')
}

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false,
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!isFormData && body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Erro desconhecido')
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function cadastrar(nome: string, email: string, senha: string, aceite_privacidade: boolean) {
  return req<{ id: number; nome: string; email: string }>('POST', '/usuarios/', { nome, email, senha, aceite_privacidade })
}

export async function login(email: string, senha: string) {
  const form = new URLSearchParams()
  form.append('username', email)
  form.append('password', senha)
  const res = await fetch(`${BASE}/usuarios/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
  if (!res.ok) throw new Error('E-mail ou senha incorretos')
  const data = await res.json()
  salvarToken(data.access_token)
  return data
}

export async function getEu() {
  return req<{ id: number; nome: string; email: string }>('GET', '/usuarios/eu')
}

// ── Projetos ─────────────────────────────────────────────────────────────────

export interface ProjetoListagem {
  id: number
  titulo: string
  status: string
  duracao: number | null
  video_url: string | null
  created_at: string
}

export interface Projeto {
  id: number
  titulo: string
  descricao: string | null
  video_url: string | null
  duracao: number | null
  status: string
  transcricao: string | null
  segmentos_json: string | null
  headline: string | null
  big_idea: string | null
  hook: string | null
  descricao_yt: string | null
  sugestao_shorts: string | null
  temas_json?: string | null
  created_at: string
}

export async function listarProjetos() {
  return req<ProjetoListagem[]>('GET', '/projetos/')
}

export async function criarProjeto(titulo: string, descricao?: string) {
  return req<Projeto>('POST', '/projetos/', { titulo, descricao })
}

export async function getProjeto(id: number) {
  return req<Projeto>('GET', `/projetos/${id}/`)
}

export async function apagarProjeto(id: number) {
  return req<void>('DELETE', `/projetos/${id}/`)
}

// ── Vídeos ───────────────────────────────────────────────────────────────────

export async function uploadVideo(projetoId: number, file: File) {
  // Upload vai direto para o backend (porta 8000) para evitar o limite de 10MB do proxy Next.js
  const token = typeof window !== 'undefined' ? localStorage.getItem('precut_token') : null
  const fd = new FormData()
  fd.append('file', file)
  const apiUploadBase = BASE
  const res = await fetch(`${apiUploadBase}/videos/upload/${projetoId}/`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Erro ao fazer upload')
  }
  return res.json() as Promise<{ video_url: string; duracao: number | null }>
}

export async function trimVideo(projetoId: number, start: number, end: number) {
  return req<{ trimmed_url: string }>('POST', '/videos/trim/', {
    projeto_id: projetoId,
    start,
    end,
  })
}

// ── IA ───────────────────────────────────────────────────────────────────────

export interface AnaliseIA {
  status: string
  transcricao: string
  segmentos?: Array<{ inicio: number; fim: number; texto: string }>
  headline: string
  big_idea: string
  hook: string
  descricao_yt: string
  temas?: string[]
  sugestao_shorts: Array<{ titulo: string; inicio?: number; fim?: number; headline?: string; hook?: string; big_idea?: string; descricao?: string }>
}

export async function processar(projetoId: number) {
  return req<AnaliseIA>('POST', `/ia/processar/${projetoId}/`)
}

export async function chat(projetoId: number, mensagem: string) {
  return req<{ resposta: string }>('POST', `/ia/chat/${projetoId}/`, { mensagem })
}

export async function getMediaToken(projetoId: number) {
  return req<{token: string}>('GET', `/videos/media-token/${projetoId}`)
}
export function mediaUrl(projetoId: number, originalUrl: string, token: string) {
  return `${BASE}/videos/media/${projetoId}/${encodeURIComponent(originalUrl.split('/').pop() ?? '')}?token=${encodeURIComponent(token)}`
}
export async function getChatHistorico(projetoId: number) {
  return req<Array<{role: 'user' | 'ia'; texto: string}>>('GET', `/ia/chat/${projetoId}/historico`)
}

export interface PesquisaTendencias {
  tema: string
  resumo: string
  referencias: ReferenciaResearch[]
  ideias_futuras: string[]
  aviso?: string
}

export async function pesquisarTendencias(projetoId: number) {
  return req<PesquisaTendencias>('POST', `/ia/tendencias/${projetoId}/`)
}


export interface ReferenciaResearch {
  id?: number
  titulo: string
  url: string
  plataforma: string
  motivo: string
  tipo?: 'video' | 'publicacao' | 'pagina'
  status_tendencia?: 'nao_verificada' | 'verificada'
  salvo?: boolean
  criado_em?: string | null
}
export function listarReferencias(projetoId: number) {
  return req<ReferenciaResearch[]>('GET', `/ia/referencias/${projetoId}/`)
}
export function salvarReferencia(projetoId: number, dados: {url: string; titulo?: string; motivo?: string}) {
  return req<ReferenciaResearch>('POST', `/ia/referencias/${projetoId}/`, dados)
}
export function removerReferencia(projetoId: number, id: number) {
  return req<void>('DELETE', `/ia/referencias/${projetoId}/${id}/`)
}

export async function importarSrt(projetoId: number, file: File): Promise<{quantidade: number; transcricao: string}> {
  const token = getToken()
  const form = new FormData()
  form.append('arquivo', file)
  const res = await fetch(`${BASE}/ia/importar-srt/${projetoId}/`, {method: 'POST', headers: token ? {Authorization: `Bearer ${token}`} : {}, body: form})
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao importar SRT') }
  return res.json()
}
export async function baixarRelatorio(projetoId: number, formato: 'srt' | 'txt') {
  const token = getToken()
  const res = await fetch(`${BASE}/ia/exportar/${projetoId}/${formato}`, {headers: token ? {Authorization: `Bearer ${token}`} : {}})
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao exportar') }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `precut_projeto_${projetoId}.${formato}`
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
export async function salvarResultado(projetoId: number, campo: 'headline'|'hook'|'big_idea'|'descricao_yt', texto: string) {
  return req<{campo: string; texto: string}>('PATCH', `/ia/resultados/${projetoId}/`, {campo, texto})
}

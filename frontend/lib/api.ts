const BASE = '/api'

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

export async function cadastrar(nome: string, email: string, senha: string) {
  return req<{ id: number; nome: string; email: string }>('POST', '/usuarios/', { nome, email, senha })
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
  headline: string | null
  big_idea: string | null
  hook: string | null
  descricao_yt: string | null
  sugestao_shorts: string | null
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
  const res = await fetch(`http://localhost:8000/videos/upload/${projetoId}/`, {
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
  headline: string
  big_idea: string
  hook: string
  descricao_yt: string
  sugestao_shorts: Array<{ titulo: string; inicio?: number; fim?: number }>
}

export async function processar(projetoId: number) {
  return req<AnaliseIA>('POST', `/ia/processar/${projetoId}/`)
}

export async function chat(projetoId: number, mensagem: string) {
  return req<{ resposta: string }>('POST', `/ia/chat/${projetoId}/`, { mensagem })
}

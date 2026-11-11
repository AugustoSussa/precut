// A camada de serviço dos projetos — equivalente ao livro_service.dart do tutorial.
// Isola a lógica de negócio das telas: quem chama não precisa saber de fetch ou token.
// Traduz erros técnicos (HTTP, rede) em frases legíveis para o usuário.

import {
  listarProjetos,
  criarProjeto,
  getProjeto,
  apagarProjeto,
  type ProjetoListagem,
  type Projeto,
} from '@/lib/api'

// ── Erros de domínio ──────────────────────────────────────────────────────────
// Equivalente ao ErroDeLivros do Flutter: uma frase que a tela mostra.

export class ErroDeProjeto extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroDeProjeto'
  }
}

// ── Funções do service ────────────────────────────────────────────────────────
// Cada função pega/salva dados e traduz qualquer falha em ErroDeProjeto.

export async function listar(): Promise<ProjetoListagem[]> {
  try {
    return await listarProjetos()
  } catch (e: any) {
    if (e instanceof ErroDeProjeto) throw e
    // Sem token, token vencido etc. — redireciona quem chamou
    if (e.message?.includes('401') || e.message?.includes('não autorizado')) {
      throw new ErroDeProjeto('Sessão expirada. Faça login novamente.')
    }
    throw new ErroDeProjeto(
      'Não consegui carregar os projetos. O servidor está rodando?',
    )
  }
}

export async function criar(titulo: string, descricao?: string): Promise<Projeto> {
  const t = titulo.trim()
  if (!t) throw new ErroDeProjeto('O título não pode ficar em branco.')
  try {
    return await criarProjeto(t, descricao)
  } catch (e: any) {
    if (e instanceof ErroDeProjeto) throw e
    throw new ErroDeProjeto(e.message || 'Não consegui criar o projeto.')
  }
}

export async function buscar(id: number): Promise<Projeto> {
  try {
    return await getProjeto(id)
  } catch (e: any) {
    if (e instanceof ErroDeProjeto) throw e
    if (e.message?.includes('404') || e.message?.includes('não encontrado')) {
      throw new ErroDeProjeto('Projeto não encontrado ou sem permissão.')
    }
    throw new ErroDeProjeto(
      'Não consegui carregar o projeto. O servidor está rodando?',
    )
  }
}

export async function apagar(id: number): Promise<void> {
  try {
    await apagarProjeto(id)
  } catch (e: any) {
    if (e instanceof ErroDeProjeto) throw e
    throw new ErroDeProjeto(e.message || 'Não consegui apagar o projeto.')
  }
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ProjetosPage from '../app/projetos/page'

const { push, replace, listar } = vi.hoisted(() => ({
  push: vi.fn(), replace: vi.fn(), listar: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
}))
vi.mock('@/lib/services/projeto_service', () => ({
  listar,
  criar: vi.fn(),
  apagar: vi.fn(),
  ErroDeProjeto: class ErroDeProjeto extends Error {},
}))
vi.mock('@/lib/api', () => ({
  removerToken: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('precut_token', 'token-de-teste')
})
afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('listagem de projetos', () => {
  it('mostra o projeto devolvido pelo serviço', async () => {
    listar.mockResolvedValueOnce([{
      id: 1, titulo: 'Meu teste audiovisual', status: 'pendente',
      duracao: 15, video_url: null, created_at: '2026-11-12T12:00:00',
    }])
    render(<ProjetosPage />)
    expect(await screen.findByText('Meu teste audiovisual')).toBeTruthy()
    expect(screen.queryByText('Nenhum projeto ainda')).toBeNull()
  })

  it('apresenta mensagem quando a lista está vazia', async () => {
    listar.mockResolvedValueOnce([])
    render(<ProjetosPage />)
    expect(await screen.findByText('Nenhum projeto ainda')).toBeTruthy()
  })

  it('mostra falha de rede e oferece nova tentativa', async () => {
    listar.mockRejectedValueOnce(new Error('Falha ao consultar projetos'))
    render(<ProjetosPage />)
    expect(await screen.findByText('Falha ao consultar projetos')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })

  it('redireciona sem token de autenticação', async () => {
    localStorage.removeItem('precut_token')
    render(<ProjetosPage />)
    expect(replace).toHaveBeenCalledWith('/')
    expect(listar).not.toHaveBeenCalled()
  })
})

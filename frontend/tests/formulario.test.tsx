import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import CadastroPage from '../app/cadastro/page'
import LoginPage from '../app/page'

const { push, cadastrar, login } = vi.hoisted(() => ({
  push: vi.fn(),
  cadastrar: vi.fn(),
  login: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}))
vi.mock('@/lib/api', () => ({
  cadastrar, login,
}))

function preencherCadastro(senha = 'segredo123', confirmar = 'segredo123') {
  fireEvent.change(screen.getByPlaceholderText('Seu nome'), { target: { value: 'Ana' } })
  fireEvent.change(screen.getByPlaceholderText('voce@exemplo.com'), { target: { value: 'ana@ifg.edu.br' } })
  const senhas = screen.getAllByPlaceholderText('••••••••')
  fireEvent.change(senhas[0], { target: { value: senha } })
  fireEvent.change(senhas[1], { target: { value: confirmar } })
}

beforeEach(() => { vi.clearAllMocks() })
afterEach(() => { cleanup() })

describe('formulário de cadastro', () => {
  it('recusa cadastro sem o aceite de privacidade', async () => {
    render(<CadastroPage />)
    preencherCadastro()
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText('Leia e aceite o aviso de privacidade')).toBeTruthy()
    expect(cadastrar).not.toHaveBeenCalled()
  })

  it('recusa confirmação de senha diferente', async () => {
    render(<CadastroPage />)
    preencherCadastro('segredo123', 'diferente123')
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText('As senhas não coincidem')).toBeTruthy()
    expect(cadastrar).not.toHaveBeenCalled()
  })

  it('com dados válidos cadastra e navega aos projetos', async () => {
    cadastrar.mockResolvedValueOnce({ id: 1 })
    login.mockResolvedValueOnce({ access_token: 'token' })
    render(<CadastroPage />)
    preencherCadastro()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/projetos'))
    expect(cadastrar).toHaveBeenCalledWith('Ana', 'ana@ifg.edu.br', 'segredo123', true)
  })
})

describe('formulário de login', () => {
  it('exibe o erro da autenticação sem redirecionar', async () => {
    login.mockRejectedValueOnce(new Error('E-mail ou senha incorretos'))
    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('voce@exemplo.com'), { target: { value: 'ana@ifg.edu.br' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'errada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('E-mail ou senha incorretos')).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
  })
})

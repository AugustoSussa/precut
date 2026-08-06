'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { PROJETOS_INICIAIS, type Projeto } from '@/lib/projetos'

type NovoProjeto = Omit<Projeto, 'id'>

interface ProjetosContextValue {
  projetos: Projeto[]
  getProjeto: (id: string) => Projeto | undefined
  criarProjeto: (dados: NovoProjeto) => string
  atualizarProjeto: (id: string, dados: NovoProjeto) => void
  excluirProjeto: (id: string) => void
}

const ProjetosContext = createContext<ProjetosContextValue | null>(null)

export function ProjetosProvider({ children }: { children: React.ReactNode }) {
  const [projetos, setProjetos] = useState<Projeto[]>(PROJETOS_INICIAIS)

  const getProjeto = useCallback(
    (id: string) => projetos.find((p) => p.id === id),
    [projetos],
  )

  const criarProjeto = useCallback((dados: NovoProjeto) => {
    const id = crypto.randomUUID()
    setProjetos((atuais) => [{ id, ...dados }, ...atuais])
    return id
  }, [])

  const atualizarProjeto = useCallback((id: string, dados: NovoProjeto) => {
    setProjetos((atuais) =>
      atuais.map((p) => (p.id === id ? { id, ...dados } : p)),
    )
  }, [])

  const excluirProjeto = useCallback((id: string) => {
    setProjetos((atuais) => atuais.filter((p) => p.id !== id))
  }, [])

  const value = useMemo(
    () => ({
      projetos,
      getProjeto,
      criarProjeto,
      atualizarProjeto,
      excluirProjeto,
    }),
    [projetos, getProjeto, criarProjeto, atualizarProjeto, excluirProjeto],
  )

  return (
    <ProjetosContext.Provider value={value}>
      {children}
    </ProjetosContext.Provider>
  )
}

export function useProjetos() {
  const ctx = useContext(ProjetosContext)
  if (!ctx) {
    throw new Error('useProjetos deve ser usado dentro de ProjetosProvider')
  }
  return ctx
}

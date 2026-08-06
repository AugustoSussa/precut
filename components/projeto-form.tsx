'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  FieldError,
  Input,
  Label,
  Select,
  Textarea,
} from '@/components/ui/field'
import { useProjetos } from '@/components/projetos-provider'
import {
  STATUS,
  TIPOS,
  type Projeto,
  type StatusProcessamento,
  type TipoProjeto,
} from '@/lib/projetos'

type Erros = {
  titulo?: string
  tipo?: string
  data_upload?: string
  duracao_min?: string
  status_processamento?: string
}

export function ProjetoForm({ projeto }: { projeto?: Projeto }) {
  const router = useRouter()
  const { criarProjeto, atualizarProjeto } = useProjetos()
  const editando = Boolean(projeto)

  const [titulo, setTitulo] = useState(projeto?.titulo ?? '')
  const [tipo, setTipo] = useState<TipoProjeto | ''>(projeto?.tipo ?? '')
  const [dataUpload, setDataUpload] = useState(projeto?.data_upload ?? '')
  const [duracao, setDuracao] = useState(
    projeto ? String(projeto.duracao_min) : '',
  )
  const [status, setStatus] = useState<StatusProcessamento | ''>(
    projeto?.status_processamento ?? 'aguardando',
  )
  const [observacao, setObservacao] = useState(projeto?.observacao ?? '')
  const [erros, setErros] = useState<Erros>({})

  function validar(): Erros {
    const e: Erros = {}
    if (!titulo.trim()) e.titulo = 'Informe o título do projeto.'
    if (!tipo) e.tipo = 'Selecione o tipo do vídeo.'
    if (!dataUpload) e.data_upload = 'Informe a data de upload.'
    if (!duracao.trim()) {
      e.duracao_min = 'Informe a duração em minutos.'
    } else if (!/^\d+$/.test(duracao.trim())) {
      e.duracao_min = 'A duração deve ser um número inteiro de minutos.'
    } else if (Number(duracao) <= 0) {
      e.duracao_min = 'A duração deve ser maior que zero.'
    }
    if (!status) e.status_processamento = 'Selecione o status de processamento.'
    return e
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const novosErros = validar()
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) return

    const dados = {
      titulo: titulo.trim(),
      tipo: tipo as TipoProjeto,
      data_upload: dataUpload,
      duracao_min: Number(duracao),
      status_processamento: status as StatusProcessamento,
      observacao: observacao.trim() || undefined,
    }

    if (projeto) {
      atualizarProjeto(projeto.id, dados)
      router.push(`/projetos/${projeto.id}`)
    } else {
      const id = criarProjeto(dados)
      router.push(`/projetos/${id}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div>
        <Label htmlFor="titulo">
          Título <span className="text-destructive">*</span>
        </Label>
        <Input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Entrevista com o fundador da startup"
          aria-invalid={Boolean(erros.titulo)}
        />
        <FieldError>{erros.titulo}</FieldError>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="tipo">
            Tipo <span className="text-destructive">*</span>
          </Label>
          <Select
            id="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoProjeto)}
            aria-invalid={Boolean(erros.tipo)}
          >
            <option value="" disabled>
              Selecione…
            </option>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <FieldError>{erros.tipo}</FieldError>
        </div>

        <div>
          <Label htmlFor="status">
            Status de processamento <span className="text-destructive">*</span>
          </Label>
          <Select
            id="status"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as StatusProcessamento)
            }
            aria-invalid={Boolean(erros.status_processamento)}
          >
            {STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <FieldError>{erros.status_processamento}</FieldError>
        </div>

        <div>
          <Label htmlFor="data_upload">
            Data de upload <span className="text-destructive">*</span>
          </Label>
          <Input
            id="data_upload"
            type="date"
            value={dataUpload}
            onChange={(e) => setDataUpload(e.target.value)}
            aria-invalid={Boolean(erros.data_upload)}
          />
          <FieldError>{erros.data_upload}</FieldError>
        </div>

        <div>
          <Label htmlFor="duracao_min">
            Duração (minutos) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="duracao_min"
            inputMode="numeric"
            value={duracao}
            onChange={(e) => setDuracao(e.target.value)}
            placeholder="Ex.: 74"
            aria-invalid={Boolean(erros.duracao_min)}
          />
          <FieldError>{erros.duracao_min}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="observacao">Observação</Label>
        <Textarea
          id="observacao"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Anotações opcionais sobre o que priorizar nos cortes…"
        />
        <p className="mt-1.5 text-sm text-muted-foreground">
          Campo opcional.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          size="lg"
          nativeButton={false}
          render={
            <Link href={projeto ? `/projetos/${projeto.id}` : '/projetos'} />
          }
        >
          Cancelar
        </Button>
        <Button type="submit" size="lg">
          {editando ? 'Salvar alterações' : 'Criar projeto'}
        </Button>
      </div>
    </form>
  )
}

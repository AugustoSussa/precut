'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Upload, Scissors, Play, Pause, Zap,
  MessageSquare, Copy, Check, Loader2, SkipBack, SkipForward,
  Volume2, Lock, Eye, Mic, ChevronDown, Download
} from 'lucide-react'
import {
  processar, chat,
  type Projeto, type AnaliseIA,
} from '@/lib/api'
import * as ProjetoService from '@/lib/services/projeto_service'
import * as VideoService from '@/lib/services/video_service'
import { formatarDuracao, STATUS_COLOR, STATUS_LABEL } from '@/lib/utils'

type Aba = 'editor' | 'ia' | 'chat'

function pad(n: number) { return String(Math.floor(n)).padStart(2, '0') }
function toTimecode(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const f = Math.floor((s % 1) * 30)
  return `${pad(h)}:${pad(m)}:${pad(sec)}:${pad(f)}`
}

export default function ProjetoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const projetoId = Number(id)

  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [aba, setAba] = useState<Aba>('editor')
  const [carregando, setCarregando] = useState(true)

  // Player
  const videoRef = useRef<HTMLVideoElement>(null)
  const [tocando, setTocando] = useState(false)
  const [tempoAtual, setTempoAtual] = useState(0)
  const [volume, setVolume] = useState(1)

  // Timeline
  const timelineRef = useRef<HTMLDivElement>(null)
  const [corteInicio, setCorteInicio] = useState(0)
  const [corteFim, setCorteFim] = useState(0)
  const [zoom, setZoom] = useState(1)

  // Upload / Corte
  const [uploadando, setUploadando] = useState(false)
  const [cortando, setCortando] = useState(false)
  const [urlCorte, setUrlCorte] = useState<string | null>(null)

  // IA
  const [analise, setAnalise] = useState<AnaliseIA | null>(null)
  const [processando, setProcessando] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)

  // Chat
  const [msgs, setMsgs] = useState<{ role: 'user' | 'ia'; texto: string }[]>([])
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => { carregar() }, [])
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [msgs])

  async function carregar() {
    try {
      const p = await ProjetoService.buscar(projetoId)
      setProjeto(p)
      if (p.duracao) setCorteFim(p.duracao)
      if (p.status === 'pronto') {
        setAnalise({
          status: 'pronto',
          transcricao: p.transcricao ?? '',
          headline: p.headline ?? '',
          big_idea: p.big_idea ?? '',
          hook: p.hook ?? '',
          descricao_yt: p.descricao_yt ?? '',
          sugestao_shorts: p.sugestao_shorts ? JSON.parse(p.sugestao_shorts) : [],
        })
      }
    } catch { router.push('/projetos') }
    finally { setCarregando(false) }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadando(true)
    try {
      await VideoService.upload(projetoId, file)
      const p = await ProjetoService.buscar(projetoId)
      setProjeto(p)
      if (p.duracao) { setCorteInicio(0); setCorteFim(p.duracao) }
    } catch (err: any) { alert(err.message) }
    finally { setUploadando(false) }
  }

  function togglePlay() {
    if (!videoRef.current) return
    if (tocando) videoRef.current.pause()
    else videoRef.current.play()
    setTocando(!tocando)
  }

  function seek(t: number) {
    if (videoRef.current) videoRef.current.currentTime = t
    setTempoAtual(t)
  }

  async function handleCortar() {
    setCortando(true)
    try {
      const res = await VideoService.trim(projetoId, corteInicio, corteFim)
      setUrlCorte(`/api${res.trimmed_url}`)
    } catch (err: any) { alert(err.message) }
    finally { setCortando(false) }
  }

  async function handleProcessar() {
    setProcessando(true)
    try {
      const res = await processar(projetoId)
      setAnalise(res)
      const p = await ProjetoService.buscar(projetoId)
      setProjeto(p)
      setAba('ia')
    } catch (err: any) { alert(err.message) }
    finally { setProcessando(false) }
  }

  async function handleChat(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || enviando) return
    const msg = input.trim()
    setInput('')
    setMsgs(m => [...m, { role: 'user', texto: msg }])
    setEnviando(true)
    try {
      const res = await chat(projetoId, msg)
      setMsgs(m => [...m, { role: 'ia', texto: res.resposta }])
    } catch (err: any) {
      setMsgs(m => [...m, { role: 'ia', texto: `Erro: ${err.message}` }])
    } finally { setEnviando(false) }
  }

  function copiar(campo: string, texto: string) {
    navigator.clipboard.writeText(texto)
    setCopiado(campo)
    setTimeout(() => setCopiado(null), 2000)
  }

  // Clique na timeline para seek
  function handleTimelineClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!timelineRef.current || !duracao) return
    const rect = timelineRef.current.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    seek(ratio * duracao)
  }

  if (carregando) return (
    <div className="min-h-dvh bg-[#1A1A1F] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-[#7C3AED] animate-spin" />
    </div>
  )
  if (!projeto) return null

  const videoSrc = projeto.video_url ? `/api${projeto.video_url}` : null
  const duracao = projeto.duracao ?? 0
  const progresso = duracao ? (tempoAtual / duracao) * 100 : 0
  const inicioP = duracao ? (corteInicio / duracao) * 100 : 0
  const fimP = duracao ? (corteFim / duracao) * 100 : 100

  return (
    <div className="min-h-dvh bg-[#141418] flex flex-col text-[#D0D0E0] text-sm select-none">

      {/* ── Barra de menu superior ── */}
      <header className="h-9 bg-[#1E1E26] border-b border-[#2A2A38] flex items-center px-3 gap-4 shrink-0">
        <Link href="/projetos" className="flex items-center gap-1.5 text-[#7C7C99] hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="text-xs">Projetos</span>
        </Link>
        <div className="h-4 w-px bg-[#2A2A38]" />
        <span className="text-xs font-medium text-white truncate max-w-xs">{projeto.titulo}</span>
        <div className="flex-1" />
        {/* Abas estilo workspace */}
        {([
          { key: 'editor', label: 'Edição' },
          { key: 'ia',     label: 'Análise IA' },
          { key: 'chat',   label: 'Chat' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setAba(key)}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              aba === key
                ? 'bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/40'
                : 'text-[#6B6B80] hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[projeto.status] ?? ''}`}>
          {STATUS_LABEL[projeto.status] ?? projeto.status}
        </span>
      </header>

      {/* ══════════════════════════════════════════ ABA EDITOR ══ */}
      {aba === 'editor' && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Área principal: player */}
          <div className="flex-1 flex bg-[#0E0E12] overflow-hidden min-h-0">

            {/* Monitor central */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
              {!videoSrc ? (
                <label className="flex flex-col items-center justify-center w-full max-w-2xl aspect-video border border-dashed border-[#2A2A38] hover:border-[#7C3AED]/60 rounded-xl cursor-pointer transition-colors group bg-[#141418]">
                  <Upload className="w-10 h-10 text-[#3A3A50] group-hover:text-[#7C3AED] mb-3 transition-colors" />
                  <span className="text-sm font-medium text-[#6B6B80] group-hover:text-white transition-colors">
                    {uploadando ? 'Enviando...' : 'Soltar vídeo aqui ou clicar para enviar'}
                  </span>
                  <span className="text-xs text-[#3A3A50] mt-1">MP4 · MOV · AVI · MKV · WebM</span>
                  <input type="file" accept="video/*" onChange={handleUpload} className="hidden" />
                </label>
              ) : (
                <>
                  {/* Program monitor */}
                  <div className="relative w-full max-w-2xl aspect-video bg-black rounded overflow-hidden shadow-2xl">
                    <video
                      ref={videoRef}
                      src={videoSrc}
                      className="w-full h-full object-contain"
                      onTimeUpdate={e => setTempoAtual(e.currentTarget.currentTime)}
                      onEnded={() => setTocando(false)}
                    />
                    {/* Timecode overlay */}
                    <div className="absolute bottom-2 left-2 font-mono text-xs text-[#00D4FF] bg-black/60 px-2 py-0.5 rounded">
                      {toTimecode(tempoAtual)}
                    </div>
                    <div className="absolute bottom-2 right-2 font-mono text-xs text-[#6B6B80] bg-black/60 px-2 py-0.5 rounded">
                      {toTimecode(duracao)}
                    </div>
                  </div>

                  {/* Controles de transporte */}
                  <div className="flex items-center gap-4 bg-[#1A1A24] border border-[#2A2A38] rounded-lg px-5 py-2.5">
                    <button onClick={() => seek(0)} className="text-[#6B6B80] hover:text-white transition-colors">
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button onClick={() => seek(Math.max(0, tempoAtual - 5))} className="text-[#6B6B80] hover:text-white transition-colors">
                      <span className="text-xs font-mono">-5s</span>
                    </button>
                    <button
                      onClick={togglePlay}
                      className="w-9 h-9 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] flex items-center justify-center transition-colors shadow-lg shadow-[#7C3AED]/30"
                    >
                      {tocando
                        ? <Pause className="w-4 h-4 text-white" />
                        : <Play className="w-4 h-4 text-white ml-0.5" />}
                    </button>
                    <button onClick={() => seek(Math.min(duracao, tempoAtual + 5))} className="text-[#6B6B80] hover:text-white transition-colors">
                      <span className="text-xs font-mono">+5s</span>
                    </button>
                    <button onClick={() => seek(duracao)} className="text-[#6B6B80] hover:text-white transition-colors">
                      <SkipForward className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-[#2A2A38]" />
                    <Volume2 className="w-3.5 h-3.5 text-[#6B6B80]" />
                    <input
                      type="range" min={0} max={1} step={0.05} value={volume}
                      onChange={e => {
                        const v = Number(e.target.value)
                        setVolume(v)
                        if (videoRef.current) videoRef.current.volume = v
                      }}
                      className="w-20 accent-[#7C3AED]"
                    />
                    <div className="w-px h-4 bg-[#2A2A38]" />
                    <span className="font-mono text-xs text-[#00D4FF]">{toTimecode(tempoAtual)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Timeline ── */}
          {videoSrc && (
            <div className="shrink-0 bg-[#13131A] border-t border-[#2A2A38]">

              {/* Toolbar da timeline */}
              <div className="h-8 border-b border-[#2A2A38] flex items-center px-3 gap-3">
                <span className="text-xs font-semibold text-[#6B6B80] uppercase tracking-wider">Timeline</span>
                <div className="flex-1" />
                <button
                  onClick={() => { setCorteInicio(tempoAtual) }}
                  className="text-xs px-2.5 py-1 bg-[#1E1E26] border border-[#2A2A38] hover:border-[#7C3AED]/50 rounded text-[#A78BFA] transition-colors"
                >
                  Marcar IN
                </button>
                <button
                  onClick={() => { setCorteFim(tempoAtual) }}
                  className="text-xs px-2.5 py-1 bg-[#1E1E26] border border-[#2A2A38] hover:border-[#7C3AED]/50 rounded text-[#A78BFA] transition-colors"
                >
                  Marcar OUT
                </button>
                <div className="w-px h-4 bg-[#2A2A38]" />
                <button
                  onClick={handleCortar}
                  disabled={cortando}
                  className="flex items-center gap-1.5 text-xs px-3 py-1 bg-[#7C3AED]/20 border border-[#7C3AED]/50 hover:bg-[#7C3AED]/30 rounded text-[#A78BFA] transition-colors disabled:opacity-50"
                >
                  {cortando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scissors className="w-3 h-3" />}
                  Exportar corte
                </button>
                {urlCorte && (
                  <a href={urlCorte} download className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors">
                    <Download className="w-3 h-3" />
                    Baixar
                  </a>
                )}
                <div className="w-px h-4 bg-[#2A2A38]" />
                <span className="text-xs text-[#3A3A50]">Zoom</span>
                <input type="range" min={1} max={5} step={0.5} value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  className="w-16 accent-[#7C3AED]" />
              </div>

              {/* Faixas */}
              <div className="flex">
                {/* Painel de labels das faixas */}
                <div className="w-28 shrink-0 border-r border-[#2A2A38]">
                  {/* Régua vazia */}
                  <div className="h-6 border-b border-[#2A2A38] bg-[#0E0E12]" />
                  {/* V1 */}
                  <div className="h-14 border-b border-[#2A2A38] bg-[#1A1A24] flex items-center px-2 gap-1.5">
                    <div className="w-5 h-5 rounded bg-[#3B82F6] flex items-center justify-center text-white text-[9px] font-bold shrink-0">V1</div>
                    <span className="text-xs text-[#9090B0] truncate">Vídeo 1</span>
                    <Eye className="w-3 h-3 text-[#3A3A50] ml-auto shrink-0" />
                    <Lock className="w-3 h-3 text-[#3A3A50] shrink-0" />
                  </div>
                  {/* A1 */}
                  <div className="h-12 border-b border-[#2A2A38] bg-[#161620] flex items-center px-2 gap-1.5">
                    <div className="w-5 h-5 rounded bg-[#22C55E] flex items-center justify-center text-white text-[9px] font-bold shrink-0">A1</div>
                    <span className="text-xs text-[#9090B0] truncate">Áudio 1</span>
                    <Mic className="w-3 h-3 text-[#3A3A50] ml-auto shrink-0" />
                  </div>
                </div>

                {/* Área scrollável da timeline */}
                <div className="flex-1 overflow-x-auto">
                  <div style={{ width: `${zoom * 100}%`, minWidth: '100%' }}>

                    {/* Régua de tempo */}
                    <div
                      ref={timelineRef}
                      onClick={handleTimelineClick}
                      className="h-6 border-b border-[#2A2A38] bg-[#0E0E12] relative cursor-pointer"
                    >
                      {Array.from({ length: 11 }).map((_, i) => {
                        const t = (i / 10) * duracao
                        return (
                          <div key={i} className="absolute top-0 flex flex-col items-center" style={{ left: `${i * 10}%` }}>
                            <div className="w-px h-2 bg-[#3A3A50]" />
                            <span className="text-[9px] text-[#3A3A50] font-mono mt-0.5">{formatarDuracao(t)}</span>
                          </div>
                        )
                      })}
                      {/* Playhead */}
                      <div
                        className="absolute top-0 bottom-0 w-px bg-[#00D4FF] z-10 pointer-events-none"
                        style={{ left: `${progresso}%` }}
                      >
                        <div className="w-2 h-2 bg-[#00D4FF] rotate-45 -translate-x-[3px] -translate-y-[1px]" />
                      </div>
                    </div>

                    {/* Faixa V1 — clipe de vídeo */}
                    <div
                      className="h-14 border-b border-[#2A2A38] bg-[#1A1A24] relative cursor-pointer"
                      onClick={handleTimelineClick}
                    >
                      {duracao > 0 && (
                        <div
                          className="absolute top-2 bottom-2 rounded bg-[#3B82F6]/30 border border-[#3B82F6]/60 flex items-center px-2 overflow-hidden"
                          style={{ left: '0%', width: '100%' }}
                        >
                          <span className="text-[10px] text-[#93C5FD] font-medium truncate">
                            {projeto.titulo}
                          </span>
                        </div>
                      )}
                      {/* Região de corte marcada */}
                      {duracao > 0 && (
                        <div
                          className="absolute top-1 bottom-1 bg-[#7C3AED]/20 border-x-2 border-[#7C3AED] pointer-events-none"
                          style={{ left: `${inicioP}%`, width: `${fimP - inicioP}%` }}
                        />
                      )}
                      {/* Playhead V1 */}
                      <div
                        className="absolute top-0 bottom-0 w-px bg-[#00D4FF] z-10 pointer-events-none"
                        style={{ left: `${progresso}%` }}
                      />
                    </div>

                    {/* Faixa A1 — waveform simulada */}
                    <div
                      className="h-12 bg-[#161620] relative cursor-pointer"
                      onClick={handleTimelineClick}
                    >
                      {duracao > 0 && (
                        <div className="absolute inset-2 rounded bg-[#22C55E]/20 border border-[#22C55E]/40 flex items-center overflow-hidden px-1">
                          {/* Waveform decorativa */}
                          <svg className="w-full h-full" viewBox="0 0 200 30" preserveAspectRatio="none">
                            {Array.from({ length: 80 }).map((_, i) => {
                              const h = 5 + Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.3) * 12)
                              return (
                                <rect
                                  key={i}
                                  x={i * 2.5}
                                  y={(30 - h) / 2}
                                  width={1.5}
                                  height={h}
                                  fill="rgba(34,197,94,0.7)"
                                />
                              )
                            })}
                          </svg>
                        </div>
                      )}
                      {/* Playhead A1 */}
                      <div
                        className="absolute top-0 bottom-0 w-px bg-[#00D4FF] z-10 pointer-events-none"
                        style={{ left: `${progresso}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Rodapé: IN / OUT / Duração do corte */}
              <div className="h-8 border-t border-[#2A2A38] bg-[#0E0E12] flex items-center px-4 gap-6 text-xs font-mono">
                <span className="text-[#3A3A50]">IN</span>
                <span className="text-[#A78BFA]">{toTimecode(corteInicio)}</span>
                <span className="text-[#3A3A50]">OUT</span>
                <span className="text-[#A78BFA]">{toTimecode(corteFim)}</span>
                <span className="text-[#3A3A50]">DUR</span>
                <span className="text-white">{toTimecode(Math.max(0, corteFim - corteInicio))}</span>
                <div className="flex-1" />
                {projeto.status !== 'pronto' && (
                  <button
                    onClick={handleProcessar}
                    disabled={processando || !videoSrc}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 rounded text-white text-xs font-semibold transition-colors"
                  >
                    {processando
                      ? <><Loader2 className="w-3 h-3 animate-spin" />Processando...</>
                      : <><Zap className="w-3 h-3" />Analisar com IA</>}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════ ABA IA ══ */}
      {aba === 'ia' && (
        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
            {!analise ? (
              <div className="text-center py-20">
                <Zap className="w-10 h-10 text-[#3A3A50] mx-auto mb-3" />
                <p className="text-white font-medium">Nenhuma análise ainda</p>
                <p className="text-sm text-[#6B6B80] mt-1">Vá para a aba Edição e clique em "Analisar com IA"</p>
              </div>
            ) : (
              <>
                {[
                  { campo: 'headline',    label: 'Headline' },
                  { campo: 'hook',        label: 'Hook (3 segundos)' },
                  { campo: 'big_idea',    label: 'Big Idea' },
                  { campo: 'descricao_yt',label: 'Descrição YouTube' },
                ].map(({ campo, label }) => {
                  const valor = analise[campo as keyof AnaliseIA] as string
                  return (
                    <div key={campo} className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7C7C99]">{label}</h3>
                        <button
                          onClick={() => copiar(campo, valor)}
                          className="flex items-center gap-1 text-xs text-[#6B6B80] hover:text-white transition-colors"
                        >
                          {copiado === campo
                            ? <><Check className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Copiado!</span></>
                            : <><Copy className="w-3.5 h-3.5" />Copiar</>}
                        </button>
                      </div>
                      <p className="text-sm text-[#D0D0E0] leading-relaxed whitespace-pre-wrap">{valor}</p>
                    </div>
                  )
                })}

                {analise.sugestao_shorts?.length > 0 && (
                  <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7C7C99] mb-3">
                      Sugestões de Shorts / Reels
                    </h3>
                    <ul className="space-y-2.5">
                      {analise.sugestao_shorts.map((s, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded bg-[#7C3AED]/20 text-[#A78BFA] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <div>
                            <span className="text-sm text-white font-medium">{s.titulo}</span>
                            {(s.inicio !== undefined || s.fim !== undefined) && (
                              <span className="text-[#6B6B80] ml-2 font-mono text-xs">
                                {formatarDuracao(s.inicio ?? 0)} → {formatarDuracao(s.fim ?? 0)}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analise.transcricao && (
                  <details className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5 group">
                    <summary className="text-xs font-semibold uppercase tracking-wider text-[#6B6B80] cursor-pointer hover:text-white transition-colors list-none flex items-center gap-2">
                      <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                      Transcrição completa
                    </summary>
                    <p className="mt-3 text-sm text-[#D0D0E0] leading-relaxed whitespace-pre-wrap">
                      {analise.transcricao}
                    </p>
                  </details>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ ABA CHAT ══ */}
      {aba === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {projeto.status !== 'pronto' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <MessageSquare className="w-10 h-10 text-[#3A3A50] mb-3" />
              <p className="text-white font-medium">Chat indisponível</p>
              <p className="text-sm text-[#6B6B80] mt-1">Processe o vídeo com IA antes de usar o chat.</p>
            </div>
          ) : (
            <>
              <div ref={chatRef} className="flex-1 overflow-auto px-6 py-6 space-y-4">
                {msgs.length === 0 && (
                  <div className="text-center py-10 text-[#3A3A50] text-sm">
                    Pergunte sobre o vídeo — headline, público-alvo, ideias de cortes...
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-[#7C3AED] text-white rounded-br-sm'
                        : 'bg-[#1A1A24] border border-[#2A2A38] text-[#D0D0E0] rounded-bl-sm'
                    }`}>
                      {m.texto}
                    </div>
                  </div>
                ))}
                {enviando && (
                  <div className="flex justify-start">
                    <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-2xl rounded-bl-sm px-4 py-3">
                      <Loader2 className="w-4 h-4 text-[#6B6B80] animate-spin" />
                    </div>
                  </div>
                )}
              </div>
              <form onSubmit={handleChat} className="px-6 pb-6 shrink-0">
                <div className="flex gap-3">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Pergunte sobre o vídeo..."
                    className="flex-1 px-4 py-3 bg-[#1A1A24] border border-[#2A2A38] rounded-xl text-sm text-white placeholder-[#3A3A50] focus:outline-none focus:border-[#7C3AED] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={enviando || !input.trim()}
                    className="px-4 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 rounded-xl text-sm font-medium text-white transition-colors"
                  >
                    Enviar
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}

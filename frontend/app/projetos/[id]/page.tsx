'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Upload, Scissors, Play, Pause, Zap,
  MessageSquare, Copy, Check, Loader2, SkipBack, SkipForward,
  Volume2, Lock, Eye, Mic, ChevronDown, Download, Undo2, MousePointer2, Search, ExternalLink
} from 'lucide-react'
import {
  processar, chat, getMediaToken, mediaUrl, getChatHistorico, pesquisarTendencias, type PesquisaTendencias,
  type Projeto, type AnaliseIA, importarSrt, baixarRelatorio, salvarResultado,
} from '@/lib/api'
import Research from './Research'
import * as ProjetoService from '@/lib/services/projeto_service'
import * as VideoService from '@/lib/services/video_service'
import { formatarDuracao, STATUS_COLOR, STATUS_LABEL } from '@/lib/utils'

type Aba = 'editor' | 'ia' | 'chat'
type Trecho = { inicio: number; fim: number }

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
  const [subAbaIA, setSubAbaIA] = useState<'geral' | 'cortes' | 'ideias' | 'research'>('geral')
  const [carregando, setCarregando] = useState(true)

  // Player
  const videoRef = useRef<HTMLMediaElement | null>(null)
  const [tocando, setTocando] = useState(false)
  const [tempoAtual, setTempoAtual] = useState(0)
  const [volume, setVolume] = useState(1)

  // Timeline
  const timelineRef = useRef<HTMLDivElement>(null)
  const [corteInicio, setCorteInicio] = useState(0)
  const [corteFim, setCorteFim] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [ferramenta, setFerramenta] = useState<'selecionar' | 'tesoura'>('selecionar')
  const [divisoes, setDivisoes] = useState<number[]>([])
  const [trechoSelecionado, setTrechoSelecionado] = useState<Trecho | null>(null)
  const [tendencias, setTendencias] = useState<PesquisaTendencias | null>(null)
  const [pesquisandoTendencias, setPesquisandoTendencias] = useState(false)
  const [erroTendencias, setErroTendencias] = useState<string | null>(null)

  // Upload / Corte
  const [uploadando, setUploadando] = useState(false)
  const [cortando, setCortando] = useState(false)
  const [urlCorte, setUrlCorte] = useState<string | null>(null)
  const [mediaToken, setMediaToken] = useState<string | null>(null)

  // IA
  const [editCampo, setEditCampo] = useState<'headline'|'hook'|'big_idea'|'descricao_yt'|null>(null)
  const [editTexto, setEditTexto] = useState('')
  const [salvandoEdit, setSalvandoEdit] = useState(false)
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
      if (p.video_url) setMediaToken((await getMediaToken(projetoId)).token)
      if (p.status === "pronto") setMsgs(await getChatHistorico(projetoId))
      if (p.duracao) setCorteFim(p.duracao)
      // Divisões são decisões locais e não alteram a mídia original.
      if (p.video_url && p.duracao) {
        try {
          const saved = JSON.parse(localStorage.getItem(`precut_divisoes_${projetoId}`) || '[]')
          if (Array.isArray(saved)) setDivisoes(saved.filter((t: unknown) => typeof t === 'number' && t > 0.04 && t < p.duracao! - 0.04).sort((a: number, b: number) => a - b))
        } catch { setDivisoes([]) }
      }
      if (p.status === 'pronto') {
        setAnalise({
          status: 'pronto',
          transcricao: p.transcricao ?? '',
          segmentos: p.segmentos_json ? JSON.parse(p.segmentos_json) : [],
          headline: p.headline ?? '',
          big_idea: p.big_idea ?? '',
          hook: p.hook ?? '',
          descricao_yt: p.descricao_yt ?? '',
          sugestao_shorts: p.sugestao_shorts ? JSON.parse(p.sugestao_shorts) : [],
          temas: p.temas_json ? JSON.parse(p.temas_json) : [],
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
      setMediaToken((await getMediaToken(projetoId)).token)
      setAnalise(null)
      setDivisoes([])
      setTrechoSelecionado(null)
      setTendencias(null)
      localStorage.removeItem(`precut_divisoes_${projetoId}`)
      if (p.duracao) { setCorteInicio(0); setCorteFim(p.duracao) }
    } catch (err: any) { alert(err.message) }
    finally { setUploadando(false) }
  }

  async function handleSrt(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    try {
      const result = await importarSrt(projetoId, arquivo)
      alert(`${result.quantidade} segmentos importados. Clique em Analisar com IA para gerar resultados.`)
      setAnalise(null)
      const atualizado = await ProjetoService.buscar(projetoId)
      setProjeto(atualizado)
    } catch (err: any) { alert(err.message) }
    finally { e.target.value = '' }
  }

  async function salvarTexto(campo: 'headline'|'hook'|'big_idea'|'descricao_yt', texto: string) {
    if (!texto.trim()) {alert('Escreva o texto antes de salvar'); return}
    setSalvandoEdit(true)
    try {
      await salvarResultado(projetoId, campo, texto)
      setAnalise(a => a ? {...a, [campo]: texto.trim()} : a)
      setProjeto(p => p ? {...p, [campo]: texto.trim()} : p)
      setEditCampo(null)
    } catch (err: any) {alert(err.message)}
    finally {setSalvandoEdit(false)}
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
    if (projeto?.video_url?.toLowerCase().endsWith('.mp3')) {alert('O MP3 pode ser transcrito, mas exportar MP4 requer um vídeo.');return}
    setCortando(true)
    try {
      const res = await VideoService.trim(projetoId, corteInicio, corteFim)
      if (!mediaToken) throw new Error("Sessão de mídia expirada. Reabra o projeto.")
      setUrlCorte(mediaUrl(projetoId, res.trimmed_url, mediaToken))
    } catch (err: any) { alert(err.message) }
    finally { setCortando(false) }
  }

  async function baixarCorte() {
    if (!urlCorte) return
    try {
      const resposta = await fetch(urlCorte, { cache: 'no-store' })
      if (!resposta.ok) throw new Error('Corte indisponível no servidor. Tente exportar novamente.')
      const arquivo = await resposta.blob()
      const url = URL.createObjectURL(arquivo)
      const link = document.createElement('a')
      link.href = url
      link.download = `precut_corte_${projetoId}.mp4`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch (err: any) {
      alert(err.message || 'Erro ao baixar corte')
    }
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

  function dividirEm(t: number) {
    const total = projeto?.duracao ?? 0
    if (!total || t <= 0.04 || t >= total - 0.04) return
    const limites = [0, ...divisoes, total]
    if (limites.some(l => Math.abs(l - t) < 0.08)) return
    const novas = [...divisoes, t].sort((a, b) => a - b)
    setDivisoes(novas)
    localStorage.setItem(`precut_divisoes_${projetoId}`, JSON.stringify(novas))
    const ix = limites.findIndex((l, i) => i < limites.length - 1 && t > l && t < limites[i + 1])
    if (ix !== -1) selecionarTrecho(limites[ix], t)
  }

  function selecionarTrecho(inicio: number, fim: number) {
    setTrechoSelecionado({ inicio, fim })
    setCorteInicio(inicio)
    setCorteFim(fim)
    setUrlCorte(null)
    seek(inicio)
  }

  function desfazerDivisao() {
    if (!divisoes.length) return
    const novas = divisoes.slice(0, -1)
    setDivisoes(novas)
    setTrechoSelecionado(null)
    setCorteInicio(0)
    setCorteFim(projeto?.duracao ?? 0)
    localStorage.setItem(`precut_divisoes_${projetoId}`, JSON.stringify(novas))
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable="true"]')) return
      if (aba !== 'editor' || !projeto?.video_url) return
      if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        dividirEm(tempoAtual)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aba, projeto, tempoAtual, divisoes])

  async function buscarTendencias() {
    if (!analise) return
    setPesquisandoTendencias(true)
    setErroTendencias(null)
    try {
      setTendencias(await pesquisarTendencias(projetoId))
    } catch (err: any) { setErroTendencias(err.message || 'Falha ao pesquisar') }
    finally { setPesquisandoTendencias(false) }
  }

  function aplicarCorte(inicio: number, fim: number) {
    const duracao = projeto?.duracao ?? 0
    if (!(inicio >= 0 && fim > inicio && fim <= duracao + 0.1)) {
      alert('Intervalo sugerido inválido para este vídeo.')
      return
    }
    setTrechoSelecionado(null)
    setCorteInicio(inicio)
    setCorteFim(Math.min(fim, duracao))
    setUrlCorte(null)
    setAba('editor')
    seek(inicio)
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
    const t = Math.max(0, Math.min(duracao, ratio * duracao))
    if (ferramenta === 'tesoura') {
      dividirEm(t)
      return
    }
    const limites = [0, ...divisoes, duracao]
    const ix = limites.findIndex((l, i) => i < limites.length - 1 && t >= l && t <= limites[i + 1])
    if (ix !== -1 && e.currentTarget.dataset.track === 'video') {
      selecionarTrecho(limites[ix], limites[ix + 1])
    } else seek(t)
  }

  if (carregando) return (
    <div className="min-h-dvh bg-[#1A1A1F] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-[#7C3AED] animate-spin" />
    </div>
  )
  if (!projeto) return null

  const videoSrc = projeto.video_url && mediaToken ? mediaUrl(projetoId, projeto.video_url, mediaToken) : null
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
                  <span className="text-xs text-[#3A3A50] mt-1">MP4 · MOV · AVI · MKV · WebM · MP3</span>
                  <input type="file" accept="video/*,audio/mpeg,.mp3" onChange={handleUpload} className="hidden" />
                </label>
              ) : (
                <>
                  {/* Program monitor */}
                  <div className="relative w-full max-w-2xl aspect-video bg-black rounded overflow-hidden shadow-2xl">
                    {projeto.video_url?.toLowerCase().endsWith('.mp3') ? <div className="h-full flex flex-col items-center justify-center gap-4 text-[#C6B4FF]"><Mic size={40}/><p>Áudio MP3 — transcrição e análise</p><audio ref={el => { videoRef.current = el }} src={videoSrc} controls onTimeUpdate={e => setTempoAtual(e.currentTarget.currentTime)} onEnded={() => setTocando(false)}/></div> : <video
                      ref={el => { videoRef.current = el }}
                      src={videoSrc}
                      className="w-full h-full object-contain"
                      onTimeUpdate={e => setTempoAtual(e.currentTarget.currentTime)}
                      onEnded={() => setTocando(false)}
                    />}
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
                <div className="flex items-center gap-1">
                  <button title="Selecionar clipe" aria-label="Ferramenta selecionar" onClick={() => setFerramenta('selecionar')} className={`p-1 rounded ${ferramenta === 'selecionar' ? 'bg-[#7C3AED]/40 text-white' : 'text-[#8E8EA4] hover:text-white'}`}><MousePointer2 className="w-4 h-4"/></button>
                  <button title="Tesoura: clique no clipe para dividir, ou pressione S" aria-label="Ferramenta tesoura" onClick={() => setFerramenta('tesoura')} className={`p-1 rounded ${ferramenta === 'tesoura' ? 'bg-[#7C3AED]/40 text-white' : 'text-[#8E8EA4] hover:text-white'}`}><Scissors className="w-4 h-4"/></button>
                  <button title="Dividir no playhead (S)" onClick={() => dividirEm(tempoAtual)} className="text-[10px] border border-[#3A3A50] rounded px-1.5 py-1 hover:text-white">Dividir (S)</button>
                  <button title="Desfazer última divisão" disabled={!divisoes.length} onClick={desfazerDivisao} className="p-1 text-[#8E8EA4] hover:text-white disabled:opacity-30"><Undo2 className="w-4 h-4" /></button>
                </div>
                <div className="flex-1" />
                <button
                  onClick={() => { setCorteInicio(tempoAtual); setTrechoSelecionado(null) }}
                  className="text-xs px-2.5 py-1 bg-[#1E1E26] border border-[#2A2A38] hover:border-[#7C3AED]/50 rounded text-[#A78BFA] transition-colors"
                >
                  Marcar IN
                </button>
                <button
                  onClick={() => { setCorteFim(tempoAtual); setTrechoSelecionado(null) }}
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
                  <button type="button" onClick={baixarCorte} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors">
                    <Download className="w-3 h-3" />
                    Baixar
                  </button>
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
                      className={`h-14 border-b border-[#2A2A38] bg-[#1A1A24] relative ${ferramenta === 'tesoura' ? 'cursor-crosshair' : 'cursor-pointer'}`}
                      data-track="video"
                      onClick={handleTimelineClick}
                    >
                      {duracao > 0 && (
                        <>
                          {[0, ...divisoes, duracao].slice(0, -1).map((inicio, i, limites) => {
                            const fim = [...divisoes, duracao][i]
                            const selecionado = trechoSelecionado?.inicio === inicio && trechoSelecionado?.fim === fim
                            return <div key={`${inicio}-${fim}`} className={`absolute top-2 bottom-2 border rounded flex items-center px-2 overflow-hidden pointer-events-none ${selecionado ? 'bg-[#7C3AED]/40 border-[#C4B5FD]' : 'bg-[#3B82F6]/30 border-[#3B82F6]/60'}`} style={{ left: `${100 * inicio / duracao}%`, width: `${100 * (fim - inicio) / duracao}%` }}>
                              <span className="text-[10px] text-[#93C5FD] truncate">{projeto.titulo} · {i + 1}</span>
                            </div>
                          })}
                        </>
                      )}
                      {/* Região de corte marcada */}
                      {duracao > 0 && (
                        <div
                          className="absolute top-1 bottom-1 bg-[#7C3AED]/20 border-x-2 border-[#7C3AED] pointer-events-none"
                          style={{ left: `${inicioP}%`, width: `${fimP - inicioP}%` }}
                        />
                      )}
                      {divisoes.map(t => <div key={t} className="absolute z-10 top-0 bottom-0 w-[2px] bg-[#E9D5FF] pointer-events-none" style={{left: `${100*t/duracao}%`}}/>)}
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
                          {/* Representação visual ilustrativa do áudio */}
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
                <span className="text-[#7C7C99]">{divisoes.length + 1} clipe(s) · tesoura divide sem modificar o original</span>
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

      {/* Importação de legenda e exportação de resultados, disponíveis por projeto. */}
      {/* ══════════════════════════════════════════ ABA IA ══ */}
      {aba === 'ia' && (
        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
            <div className="flex flex-wrap gap-2 items-center rounded-xl bg-[#1A1A24] border border-[#303044] p-3">
              <label className="cursor-pointer text-xs bg-[#302746] px-3 py-2 rounded-lg hover:text-white">Importar SRT<input type="file" accept=".srt,text/plain" className="hidden" onChange={handleSrt}/></label>
              <button onClick={() => baixarRelatorio(projetoId,'srt').catch((e:Error)=>alert(e.message))} className="text-xs rounded-lg border border-[#403854] px-3 py-2">Baixar SRT</button>
              <button onClick={() => baixarRelatorio(projetoId,'txt').catch((e:Error)=>alert(e.message))} className="text-xs rounded-lg border border-[#403854] px-3 py-2">Exportar análise TXT</button>
            </div>
            {!analise ? (
              <div className="text-center py-20">
                <Zap className="w-10 h-10 text-[#3A3A50] mx-auto mb-3" />
                <p className="text-white font-medium">Nenhuma análise ainda</p>
                <p className="text-sm text-[#6B6B80] mt-1">Envie vídeo, MP3 ou importe um SRT e execute a análise.</p>
                {(!!projeto.video_url || !!projeto.segmentos_json) && <button disabled={processando} onClick={handleProcessar} className="mt-4 bg-[#7C3AED] text-white rounded-lg px-4 py-2 disabled:opacity-50">{processando ? 'Processando...' : 'Analisar com IA'}</button>}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 border-b border-[#303044] pb-4" role="tablist" aria-label="Seções da análise IA">
                  {([
                    ['geral', 'Visão geral'], ['cortes', 'Cortes / Reels'],
                    ['ideias', 'Próximos vídeos'], ['research', 'Research'],
                  ] as const).map(([chave, nome]) => (
                    <button key={chave} role="tab" aria-selected={subAbaIA === chave}
                      onClick={() => setSubAbaIA(chave)}
                      className={`rounded-lg px-3 py-2 text-sm transition-colors ${subAbaIA === chave ? 'bg-[#7C3AED] text-white' : 'bg-[#20202C] text-[#9F9CB5] hover:text-white'}`}>
                      {nome}
                    </button>
                  ))}
                </div>

                {subAbaIA === 'geral' && <div className="space-y-4">
                  {!!analise.temas?.length && <div className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-4"><h3 className="uppercase text-xs text-[#7C7C99] mb-2">Temas identificados</h3><div className="flex flex-wrap gap-2">{analise.temas.map((tema,i)=><span key={i} className="rounded-full bg-[#302447] px-3 py-1 text-xs text-[#DCCFFF]">{tema}</span>)}</div></div>}
                  {[
                    { campo: 'headline', label: 'Headline' },
                    { campo: 'hook', label: 'Hook (3 segundos)' },
                    { campo: 'big_idea', label: 'Big Idea' },
                    { campo: 'descricao_yt', label: 'Descrição YouTube' },
                  ].map(({ campo, label }) => {
                    const valor = analise[campo as keyof AnaliseIA] as string
                    return <div key={campo} className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7C7C99]">{label}</h3>
                        <div className="flex items-center gap-3"><button onClick={() => {setEditCampo(campo as 'headline'|'hook'|'big_idea'|'descricao_yt');setEditTexto(valor)}} className="text-xs text-[#A78BFA]">Editar</button><button onClick={() => copiar(campo, valor)} className="text-xs text-[#A78BFA] flex items-center gap-1">
                          {copiado === campo ? <Check size={14}/> : <Copy size={14}/>} {copiado === campo ? 'Copiado' : 'Copiar'}
                        </button></div>
                      </div>
                      {editCampo === campo ? <div className="space-y-2"><textarea rows={4} value={editTexto} onChange={e=>setEditTexto(e.target.value)} className="w-full rounded bg-[#101018] border border-[#43365E] p-3 text-white"/><div className="flex gap-2"><button disabled={salvandoEdit} onClick={()=>salvarTexto(campo as 'headline'|'hook'|'big_idea'|'descricao_yt',editTexto)} className="px-3 py-2 bg-[#7C3AED] rounded text-white">Salvar alterações</button><button onClick={()=>setEditCampo(null)} className="px-3 py-2 rounded border border-[#403854]">Cancelar</button></div></div> : <p className="text-sm text-[#D0D0E0] whitespace-pre-wrap leading-relaxed">{valor}</p>}
                    </div>
                  })}
                </div>}

                {subAbaIA === 'cortes' && <div className="space-y-3">
                  <p className="text-xs text-[#9794AD]">Cada corte tem roteiro e textos próprios. Sugestões anteriores à V5 podem não conter esses campos; reprocesse o vídeo para gerá-los.</p>
                  {analise.sugestao_shorts?.length ? analise.sugestao_shorts.map((c, i) => (
                    <div key={i} className="bg-[#1A1A24] border border-[#333044] rounded-xl p-4 space-y-3">
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div><h3 className="font-semibold text-white">{i + 1}. {c.titulo}</h3><p className="text-xs text-[#9D94B5] font-mono mt-1">{formatarDuracao(c.inicio ?? 0)} → {formatarDuracao(c.fim ?? 0)}</p></div>
                        {typeof c.inicio === 'number' && typeof c.fim === 'number' && <button onClick={() => aplicarCorte(c.inicio!, c.fim!)} className="bg-[#7C3AED]/20 border border-[#7C3AED]/50 rounded px-3 py-2 text-xs text-[#C8B5FF]">Aplicar na timeline</button>}
                      </div>
                      {([['headline','Headline'],['hook','Hook'],['big_idea','Big Idea'],['descricao','Descrição']] as const).map(([campo,label]) => (
                        <div key={campo} className="rounded-lg bg-[#22212F] p-3">
                          <div className="flex items-center justify-between mb-1"><span className="text-[11px] uppercase tracking-wide text-[#9B96B2]">{label}</span>
                            {c[campo] && <button onClick={() => copiar(`${i}-${campo}`,c[campo]!)} className="text-[#BFA8FF] text-xs flex gap-1 items-center"><Copy size={12}/> Copiar</button>}
                          </div>
                          <p className="text-sm text-[#E2DFEE] whitespace-pre-wrap">{c[campo] || 'Ainda não disponível. Reprocesse a análise com a V5.'}</p>
                        </div>
                      ))}
                    </div>
                  )) : <p className="text-sm text-[#A29CB8]">Nenhum corte sugerido. Processe o vídeo com IA.</p>}
                </div>}

                {subAbaIA === 'ideias' && <div className="space-y-3">
                  <div className="flex justify-between gap-2 items-center"><div><h3 className="text-sm font-medium text-white">Ideias para próximos vídeos</h3><p className="text-xs text-[#918CA7]">Pautas derivadas da Big Idea, não tendências comprovadas.</p></div>
                    <button disabled={pesquisandoTendencias} onClick={buscarTendencias} className="rounded-lg bg-[#7C3AED]/25 border border-[#7C3AED]/50 text-[#D9CCFF] px-3 py-2 text-xs">{pesquisandoTendencias ? 'Pesquisando...' : 'Buscar pautas e referências'}</button>
                  </div>
                  {erroTendencias && <p className="text-xs text-red-400">{erroTendencias}</p>}
                  {tendencias?.ideias_futuras?.length ? tendencias.ideias_futuras.map((ideia,i) => <div key={i} className="rounded-xl bg-[#242135] border border-[#3D3455] p-4 flex gap-3 items-start"><span className="font-semibold text-[#A78BFA]">{i+1}</span><p className="text-sm text-[#E6DEF7]">{ideia}</p><button onClick={() => copiar(`ideia-${i}`,ideia)} className="text-[#CBB7F5]" title="Copiar pauta"><Copy size={15}/></button></div>) : <div className="border border-dashed border-[#424053] rounded-xl p-7 text-center text-sm text-[#9C98B3]">Busque para gerar pautas a partir da Big Idea do projeto.</div>}
                </div>}

                {subAbaIA === 'research' && <Research projetoId={projetoId} pesquisa={tendencias} pesquisar={buscarTendencias} buscando={pesquisandoTendencias} erroPesquisa={erroTendencias} tema={analise.big_idea} />}

                {subAbaIA === 'geral' && analise.transcricao && (
                  <details className="bg-[#1A1A24] border border-[#2A2A38] rounded-xl p-5 group">
                    <summary className="text-xs font-semibold uppercase tracking-wider text-[#6B6B80] cursor-pointer hover:text-white transition-colors list-none flex items-center gap-2">
                      <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                      Transcrição completa
                    </summary>
                    <div className="mt-3 max-h-80 overflow-y-auto space-y-1">
                      {analise.segmentos?.length ? analise.segmentos.map((seg, i) => (
                        <button key={i} type="button"
                          onClick={() => aplicarCorte(seg.inicio, seg.fim)}
                          className="block w-full text-left rounded px-2 py-1.5 text-sm text-[#D0D0E0] hover:bg-[#7C3AED]/20">
                          <span className="font-mono text-xs text-[#A78BFA] mr-2">{formatarDuracao(seg.inicio)} – {formatarDuracao(seg.fim)}</span>
                          {seg.texto}
                        </button>
                      )) : <p className="whitespace-pre-wrap text-sm">{analise.transcricao}</p>}
                    </div>
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
                      {m.role === 'ia' && <div className="border-t border-[#393448] mt-3 pt-2 flex flex-wrap gap-1"><span className="text-[10px] text-[#9990AD] w-full">Aprovar resposta como:</span>{([['headline','Headline'],['hook','Hook'],['big_idea','Big Idea'],['descricao_yt','Descrição']] as const).map(([campo,label])=><button key={campo} disabled={salvandoEdit} onClick={()=>{if(window.confirm(`Salvar esta resposta como ${label} do projeto?`)) salvarTexto(campo,m.texto)}} className="text-[11px] rounded border border-[#614D83] px-2 py-1 text-[#D8C8FA]">{label}</button>)}</div>}
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

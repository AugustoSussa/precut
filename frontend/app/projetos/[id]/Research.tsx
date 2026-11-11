'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bookmark, BookmarkCheck, ExternalLink, Link2, Loader2, Search, Trash2, Video, X } from 'lucide-react'
import { listarReferencias, salvarReferencia, removerReferencia, type PesquisaTendencias, type ReferenciaResearch } from '@/lib/api'

type Props = { projetoId: number; pesquisa: PesquisaTendencias | null; pesquisar: () => Promise<void>; buscando: boolean; erroPesquisa: string | null; tema: string }

function youtubeThumb(url: string): string | null {
  try {
    const u = new URL(url)
    const h = u.hostname.toLowerCase()
    if (!['www.youtube.com','youtube.com','m.youtube.com','youtu.be'].includes(h)) return null
    const id = h === 'youtu.be' ? u.pathname.slice(1).split('/')[0] : u.pathname.startsWith('/shorts/') ? u.pathname.split('/')[2] : u.searchParams.get('v')
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null
  } catch { return null }
}

export default function Research({projetoId, pesquisa, pesquisar, buscando, erroPesquisa, tema}: Props) {
  const [salvos, setSalvos] = useState<ReferenciaResearch[]>([])
  const [erro, setErro] = useState('')
  const [link, setLink] = useState('')
  const [titulo, setTitulo] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [manual, setManual] = useState(false)
  const [filtro, setFiltro] = useState('Todas')
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState('relevancia')
  const [selecionada, setSelecionada] = useState<ReferenciaResearch | null>(null)
  const [pendente, setPendente] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    setErro('')
    listarReferencias(projetoId)
      .then(refs => { if (ativo) setSalvos(refs) })
      .catch(e => { if (ativo) setErro(`Não foi possível carregar o acervo: ${e instanceof Error ? e.message : 'erro desconhecido'}. Se for um erro de autenticação, faça login novamente.`) })
    return () => { ativo = false }
  }, [projetoId])
  const items = useMemo(() => {
    const vistos = new Set<string>()
    return [...salvos, ...(pesquisa?.referencias ?? [])].filter(item => {
      if (vistos.has(item.url)) return false
      vistos.add(item.url)
      return (filtro === 'Todas' || (filtro === 'Salvas' ? !!item.salvo : item.plataforma === filtro)) &&
        `${item.titulo} ${item.motivo} ${item.plataforma}`.toLowerCase().includes(busca.toLowerCase())
    }).sort((a,b) => ordem === 'salvas' ? Number(!!b.salvo) - Number(!!a.salvo) : ordem === 'plataforma' ? a.plataforma.localeCompare(b.plataforma) : (a.tipo === 'video' ? -1 : 0) - (b.tipo === 'video' ? -1 : 0))
  }, [salvos, pesquisa, filtro, busca, ordem])

  async function adicionar(item?: ReferenciaResearch) {
    const url = item?.url ?? link.trim()
    if (!url) return
    setErro('')
    setAdicionando(true)
    try {
      const novo = await salvarReferencia(projetoId, {url, titulo: item?.titulo || titulo, motivo: item?.motivo || ''})
      setSalvos(v => [novo, ...v.filter(r => r.url !== novo.url)])
      setLink(''); setTitulo(''); setManual(false)
      if (selecionada?.url === novo.url) setSelecionada(novo)
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar referência') }
    finally { setAdicionando(false) }
  }
  async function remover(item: ReferenciaResearch) {
    if (!item.id) return
    setPendente(item.url)
    try {
      await removerReferencia(projetoId, item.id)
      setSalvos(v => v.filter(r => r.id !== item.id))
      setSelecionada(null)
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao remover') }
    finally { setPendente(null) }
  }
  return <section className="rounded-xl border border-[#2A2A38] bg-[#1A1A24] p-5 space-y-5">
    <div className="flex flex-wrap justify-between gap-3 items-start">
      <div><h3 className="text-lg font-semibold text-white">Research</h3><p className="text-xs text-[#9393A9] mt-1">Reels e publicações reais do Instagram, relacionados à Big Idea. Adicione links para guardar no projeto.</p></div>
      <button onClick={pesquisar} disabled={!tema || buscando} className="rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 px-4 py-2 text-sm font-medium text-white flex gap-2 items-center">{buscando ? <Loader2 size={15} className="animate-spin"/> : <Search size={15}/>} {buscando ? 'Pesquisando...' : 'Buscar com IA'}</button>
    </div>
    <div className="rounded-xl border border-[#323246] bg-[#20202D] p-4 space-y-3">
      <div className="flex justify-between gap-2 items-center"><div><p className="text-sm text-white font-medium">Adicionar referência</p><p className="text-xs text-[#85859F]">Cole um link de vídeo ou publicação para manter no projeto.</p></div><button onClick={() => setManual(!manual)} className="text-xs border border-[#48415B] px-3 py-2 rounded-lg text-[#CEBDFD]">{manual ? 'Simplificar' : 'Título manual'}</button></div>
      <div className="flex gap-2 flex-wrap sm:flex-nowrap"><div className="relative flex-1 min-w-0"><Link2 size={15} className="absolute left-3 top-3 text-[#77778F]"/><input aria-label="Link da referência" type="url" placeholder="https://youtube.com/watch?v=..." value={link} onChange={e => setLink(e.target.value)} onKeyDown={e => {if(e.key === 'Enter') adicionar()}} className="w-full bg-[#11111A] border border-[#38384B] rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"/></div><button onClick={() => adicionar()} disabled={!link.trim() || adicionando} className="px-4 py-2 text-sm text-white bg-[#53359A] rounded-lg disabled:opacity-40">Salvar</button></div>
      {manual && <input aria-label="Título opcional" placeholder="Título da referência (opcional)" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full bg-[#11111A] border border-[#38384B] rounded-lg px-3 py-2 text-sm text-white"/>}
    </div>
    {(erro || erroPesquisa) && <p role="alert" className="text-xs text-red-400">{erro || erroPesquisa}</p>}
    {tema && <p className="text-xs text-[#9090A8]"><span className="text-[#C4B5FD]">Tema:</span> {tema}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h4 className="font-medium text-sm text-white">Referências <span className="text-[#85859B]">({items.length})</span></h4><p className="text-[11px] text-[#797990]">Publicações do Instagram encontradas e links salvos manualmente</p></div>
      <div className="flex flex-wrap gap-2">
        <input aria-label="Pesquisar referências" placeholder="Pesquisar..." value={busca} onChange={e => setBusca(e.target.value)} className="bg-[#11111A] border border-[#36364A] px-3 py-2 rounded-lg text-xs text-white w-36"/>
        <select aria-label="Filtrar por plataforma" value={filtro} onChange={e => setFiltro(e.target.value)} className="bg-[#11111A] border border-[#36364A] px-2 py-2 rounded-lg text-xs text-white">{['Todas','Salvas','Instagram','YouTube','TikTok','Facebook','Web'].map(f => <option key={f}>{f}</option>)}</select>
        <select aria-label="Ordenar referências" value={ordem} onChange={e => setOrdem(e.target.value)} className="bg-[#11111A] border border-[#36364A] px-2 py-2 rounded-lg text-xs text-white"><option value="relevancia">Publicações primeiro</option><option value="salvas">Salvas primeiro</option><option value="plataforma">Plataforma</option></select>
      </div>
    </div>
    {items.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{items.map(r => {
      const thumb = youtubeThumb(r.url)
      const salvo = salvos.some(s => s.url === r.url)
      return <article key={r.url} className="overflow-hidden rounded-xl border border-[#333348] bg-[#11111B] hover:border-[#66518A] transition-colors">
        <button onClick={() => setSelecionada(r)} className="block w-full text-left" aria-label={`Ver detalhes de ${r.titulo}`}>
          <div className="relative aspect-video bg-gradient-to-br from-[#30234B] via-[#201B35] to-[#12121B] flex justify-center items-center overflow-hidden">
            {thumb ? <img src={thumb} alt="Miniatura do vídeo" loading="lazy" className="absolute w-full h-full object-cover"/> : <div className="text-center"><Video size={32} className="mx-auto text-[#9A86C4]"/><span className="text-[11px] text-[#9D91B9] mt-2 block">Prévia indisponível</span></div>}
            <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-[#0F0F18]/90 text-[10px] text-white">{r.plataforma || 'Web'}</span>
            {salvo && <BookmarkCheck size={16} className="absolute top-2 right-2 text-[#D8C7FF] drop-shadow"/>}
          </div>
          <div className="p-3 space-y-2"><p className="text-sm font-semibold text-white line-clamp-2 min-h-10">{r.titulo}</p><p className="text-[11px] text-[#8D8DA7] line-clamp-2">{r.motivo || 'Referência adicionada ao projeto.'}</p><span className="text-[10px] text-[#B7A4E9]">{r.status_tendencia === 'nao_verificada' ? 'Relacionado · engajamento não verificado' : r.tipo === 'video' ? 'Reel encontrado' : 'Referência salva'}</span></div>
        </button><div className="px-3 pb-3 flex justify-between gap-2"><a href={r.url} rel="noopener noreferrer" target="_blank" className="text-xs text-[#B79AF6] flex gap-1 items-center hover:underline">Abrir original <ExternalLink size={12}/></a>{!salvo ? <button disabled={adicionando} onClick={() => adicionar(r)} className="text-xs text-[#D7C6FF] flex gap-1 items-center"><Bookmark size={13}/> Salvar</button> : <span className="text-[11px] text-[#8F8EA8]">Salvo</span>}</div>
      </article>
    })}</div> : <div className="py-10 text-center border border-dashed border-[#36364A] rounded-xl"><Search className="mx-auto text-[#77738E] mb-2"/><p className="text-sm text-[#BAB5D0]">{busca || filtro !== 'Todas' ? 'Nenhuma referência com esses filtros.' : 'Seu acervo ainda está vazio.'}</p><p className="text-xs text-[#77778F] mt-1">Busque com IA ou adicione um link para começar.</p></div>}
    {pesquisa?.aviso && <p className="text-xs rounded-lg bg-[#252136] border border-[#45405A] p-3 text-[#CEBFF0]">{pesquisa.aviso}</p>}
    <p className="text-[11px] text-[#77778F]">Relevância temática não é viralização. Não exibimos métricas sem fonte verificável. Instagram pode exigir login e restringir prévias. As pautas derivadas ficam em Próximos vídeos.</p>
    {selecionada && <div role="dialog" aria-modal="true" aria-label="Detalhes da referência" className="fixed inset-0 z-50 bg-black/75 flex justify-center items-center p-4" onClick={() => setSelecionada(null)}><div className="bg-[#1B1B28] rounded-xl border border-[#46405A] shadow-2xl w-full max-w-lg p-5 space-y-4" onClick={e => e.stopPropagation()}><div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-white text-lg">{selecionada.titulo}</h3><button onClick={() => setSelecionada(null)} aria-label="Fechar" className="text-[#A3A0B8]"><X size={20}/></button></div><div className="flex gap-2 flex-wrap"><span className="text-xs px-2 py-1 rounded bg-[#342849] text-[#D5BDFE]">{selecionada.plataforma}</span><span className="text-xs px-2 py-1 rounded bg-[#2D2D39] text-[#9D9CAF]">{selecionada.tipo === 'video' ? 'Vídeo' : 'Referência'}</span></div><p className="text-sm text-[#C9C7D6]">{selecionada.motivo || 'Referência salva manualmente.'}</p><p className="text-xs text-[#8F8CA3] break-all">{selecionada.url}</p><div className="flex gap-2 flex-wrap"><a href={selecionada.url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#7C3AED] px-4 py-2 text-sm text-white flex gap-2 items-center">Abrir original <ExternalLink size={14}/></a>{salvos.some(r=>r.url===selecionada.url) ? <button disabled={pendente === selecionada.url} onClick={() => remover(salvos.find(r=>r.url===selecionada.url)!)} className="text-sm border border-[#594050] text-red-300 rounded-lg px-3 py-2 flex items-center gap-1"><Trash2 size={14}/> Remover do acervo</button> : <button disabled={adicionando} onClick={() => adicionar(selecionada)} className="text-sm border border-[#5D4D7D] text-[#D1BFFC] rounded-lg px-3 py-2 flex items-center gap-1"><Bookmark size={14}/> Salvar no projeto</button>}</div></div></div>}
  </section>
}

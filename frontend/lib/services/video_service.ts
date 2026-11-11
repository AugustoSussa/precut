// Equivalente ao livro_service.dart: isola o upload/trim de vídeo da tela.
// Traduz erros técnicos em frases que o usuário entende.

import { uploadVideo, trimVideo } from '@/lib/api'

export class ErroDeVideo extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroDeVideo'
  }
}

const FORMATOS_ACEITOS = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm', 'audio/mpeg', 'audio/mp3', 'audio/x-mp3']
const TAMANHO_MAX_GB = 2

export async function upload(
  projetoId: number,
  arquivo: File,
): Promise<{ video_url: string; duracao: number | null }> {
  // Validações antes de ir à rede
  if (!FORMATOS_ACEITOS.includes(arquivo.type) && !arquivo.name.match(/\.(mp4|mov|avi|mkv|webm|mp3)$/i)) {
    throw new ErroDeVideo('Formato não suportado. Use MP4, MOV, AVI, MKV, WebM ou MP3.')
  }
  if (arquivo.size > TAMANHO_MAX_GB * 1024 * 1024 * 1024) {
    throw new ErroDeVideo(`O arquivo é muito grande. Limite: ${TAMANHO_MAX_GB} GB.`)
  }
  try {
    return await uploadVideo(projetoId, arquivo)
  } catch (e: any) {
    if (e instanceof ErroDeVideo) throw e
    throw new ErroDeVideo(e.message || 'Erro ao enviar o vídeo. Tente novamente.')
  }
}

export async function trim(
  projetoId: number,
  inicio: number,
  fim: number,
): Promise<{ trimmed_url: string }> {
  if (inicio >= fim) throw new ErroDeVideo('O ponto de saída deve ser depois do ponto de entrada.')
  if (fim - inicio < 0.5) throw new ErroDeVideo('O corte precisa ter pelo menos 0,5 segundo.')
  try {
    return await trimVideo(projetoId, inicio, fim)
  } catch (e: any) {
    if (e instanceof ErroDeVideo) throw e
    throw new ErroDeVideo(e.message || 'Erro ao cortar o vídeo.')
  }
}

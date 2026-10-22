import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Précut — Edição de vídeo com IA',
  description: 'Plataforma web para pré e pós-produção de vídeos com IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}

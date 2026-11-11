/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_INTERNAL_URL || 'http://localhost:8000'}/:path*`,
      },
    ]
  },
  // Aumenta o limite do body para uploads de vídeo via proxy
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  // Limite do proxy de rewrites (Next.js 14.1+)
  middlewareClientMaxBodySize: false,
}

export default nextConfig

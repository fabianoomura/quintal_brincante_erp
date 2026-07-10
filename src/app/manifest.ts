import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Quintal Brincante',
    short_name: 'Quintal',
    description: 'Gestão interna do Quintal Brincante',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f1f5f9',
    theme_color: '#059669',
    orientation: 'any',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

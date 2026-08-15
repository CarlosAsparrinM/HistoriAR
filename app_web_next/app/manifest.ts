import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HistoriAR',
    short_name: 'HistoriAR',
    description: 'Patrimonio histórico y cultural del Perú',
    start_url: '/explorar',
    display: 'standalone',
    background_color: '#fffbfe',
    theme_color: '#8c3b1f',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HistoriAR - Monumentos del Perú',
    short_name: 'HistoriAR',
    description: 'Explora monumentos, historia y patrimonio cultural del Perú con modelos 3D y mapas interactivos.',
    start_url: '/explorar',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'es-PE',
    background_color: '#fffbfe',
    theme_color: '#8c3b1f',
    categories: ['education', 'travel', 'culture'],
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}


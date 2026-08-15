import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl, defaultOgImage, siteName, siteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Términos de uso',
  description: 'Términos de uso del catálogo cultural y educativo de HistoriAR.',
  alternates: { canonical: '/legal/terminos' },
  openGraph: {
    title: `Términos de uso | ${siteName}`,
    description: 'Términos de uso del catálogo cultural y educativo de HistoriAR.',
    url: '/legal/terminos',
    type: 'website',
    images: [defaultOgImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Términos de uso | ${siteName}`,
    description: 'Términos de uso del catálogo cultural y educativo de HistoriAR.',
    images: [defaultOgImage.url],
  },
};

export default function TermsPage() {
  return (
    <div className="flutter-screen">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Términos de uso', item: absoluteUrl('/legal/terminos') },
        ],
      }} />
      <article className="page legal">
        <h1>Términos de uso</h1>
        <p>Última actualización: agosto de 2026.</p>
        <h2>Uso del sitio</h2>
        <p>HistoriAR ofrece contenido cultural y educativo sobre monumentos del Perú. El contenido se proporciona con fines informativos y debe respetarse junto con los derechos de sus autores y fuentes.</p>
        <h2>Servicios externos</h2>
        <p>El mapa utiliza OpenStreetMap y los modelos e imágenes pueden cargarse desde almacenamiento seguro de HistoriAR.</p>
      </article>
    </div>
  );
}


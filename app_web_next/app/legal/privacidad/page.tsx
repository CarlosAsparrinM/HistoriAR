import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl, defaultOgImage, siteName, siteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Política de privacidad y tratamiento de datos de HistoriAR.',
  alternates: { canonical: '/legal/privacidad' },
  openGraph: {
    title: `Política de privacidad | ${siteName}`,
    description: 'Política de privacidad y tratamiento de datos de HistoriAR.',
    url: '/legal/privacidad',
    type: 'website',
    images: [defaultOgImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Política de privacidad | ${siteName}`,
    description: 'Política de privacidad y tratamiento de datos de HistoriAR.',
    images: [defaultOgImage.url],
  },
};

export default function PrivacyPage() {
  return (
    <div className="flutter-screen">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Política de privacidad', item: absoluteUrl('/legal/privacidad') },
        ],
      }} />
      <article className="page legal">
        <h1>Política de privacidad</h1>
        <p>Última actualización: agosto de 2026.</p>
        <p>El catálogo público no exige una cuenta. Cuando se habilite el inicio de sesión, la versión legal aceptada y el tratamiento de datos se alinearán con el backend de HistoriAR antes de permitir registros.</p>
        <h2>Datos técnicos</h2>
        <p>El backend puede procesar datos técnicos estrictamente necesarios para proteger el servicio, incluido el control de frecuencia de los cuestionarios.</p>
      </article>
    </div>
  );
}


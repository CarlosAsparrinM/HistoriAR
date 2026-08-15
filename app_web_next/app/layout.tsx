import type { Metadata } from 'next';
import '@/app/globals.css';
import { BetaNotice } from '@/components/layout/beta-notice';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl, siteDescription, siteName, siteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: { default: 'HistoriAR | Monumentos y patrimonio cultural del Perú', template: `%s | ${siteName}` },
  description: siteDescription,
  keywords: ['monumentos del Perú', 'patrimonio cultural del Perú', 'historia del Perú', 'turismo cultural', 'realidad aumentada'],
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  category: 'education',
  formatDetection: { email: false, address: false, telephone: false },
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg', apple: '/favicon.svg' },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    url: siteUrl,
    siteName,
    title: 'HistoriAR | Monumentos y patrimonio cultural del Perú',
    description: siteDescription,
    images: [{ url: '/og.png', width: 1728, height: 910, alt: 'HistoriAR: monumentos, historia y patrimonio cultural del Perú' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HistoriAR | Monumentos y patrimonio cultural del Perú',
    description: siteDescription,
    images: [{ url: '/og.png', alt: 'HistoriAR: monumentos, historia y patrimonio cultural del Perú' }],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <JsonLd data={[
          { '@context': 'https://schema.org', '@type': 'Organization', name: siteName, url: siteUrl, logo: absoluteUrl('/favicon.svg') },
          { '@context': 'https://schema.org', '@type': 'WebSite', name: siteName, url: siteUrl, description: siteDescription, inLanguage: 'es-PE', potentialAction: { '@type': 'SearchAction', target: `${absoluteUrl('/explorar')}?q={search_term_string}`, 'query-input': 'required name=search_term_string' } },
        ]} />
        <main>{children}</main>
        <BetaNotice />
      </body>
    </html>
  );
}

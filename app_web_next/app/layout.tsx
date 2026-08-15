import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import '@/app/globals.css';
import { BetaNotice } from '@/components/layout/beta-notice';
import { ServiceStatusNotice } from '@/components/layout/service-status-notice';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl, defaultKeywords, defaultOgImage, siteDescription, siteName, siteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: { default: 'HistoriAR | Monumentos y patrimonio cultural del Perú', template: `%s | ${siteName}` },
  description: siteDescription,
  keywords: defaultKeywords,
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  category: 'education',
  alternates: { canonical: siteUrl },
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
    images: [defaultOgImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HistoriAR | Monumentos y patrimonio cultural del Perú',
    description: siteDescription,
    images: [defaultOgImage.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <JsonLd data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: siteName,
            url: siteUrl,
            logo: absoluteUrl('/favicon.svg'),
            sameAs: ['https://play.google.com/store/apps/details?id=com.historiar.app'],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: siteName,
            url: siteUrl,
            description: siteDescription,
            inLanguage: 'es-PE',
            publisher: { '@type': 'Organization', name: siteName, url: siteUrl },
            potentialAction: {
              '@type': 'SearchAction',
              target: `${absoluteUrl('/explorar')}?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          },
        ]} />
        <main>{children}</main>
        <BetaNotice />
        <ServiceStatusNotice />
        <Analytics />
      </body>
    </html>
  );
}

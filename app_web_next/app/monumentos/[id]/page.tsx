import type { Metadata } from 'next';
import { CircleHelp, PlayCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { HistoricalSection } from '@/components/monument/historical-section';
import { AppFooter } from '@/components/layout/app-footer';
import { AppHeader } from '@/components/layout/app-header';
import { MonumentModelViewer } from '@/components/monument/model-viewer';
import { JsonLd } from '@/components/seo/json-ld';
import { ApiError } from '@/lib/api/errors';
import { getHistoricalData, getMonument, getQuizByMonument } from '@/lib/api/server';
import { absoluteUrl, defaultKeywords, defaultOgImage, seoDescription, siteName, siteUrl } from '@/lib/seo';
import { AdBanner } from '@/components/ads/ad-banner';

export const dynamic = 'force-dynamic';

type RouteProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const monument = await getMonument(id);
    const description = seoDescription(monument.description, `Conoce la historia, ubicación y patrimonio de ${monument.name} en HistoriAR.`);
    const canonical = `/monumentos/${encodeURIComponent(id)}`;
    const images = monument.imageUrl ? [{ url: monument.imageUrl, alt: `Vista de ${monument.name}` }] : [defaultOgImage];
    const keywords = [
      monument.name,
      monument.location.district,
      ...defaultKeywords,
    ].filter(Boolean) as string[];

    return {
      title: monument.name,
      description,
      keywords,
      alternates: { canonical },
      openGraph: {
        type: 'article',
        locale: 'es_PE',
        url: canonical,
        title: `${monument.name} | ${siteName}`,
        description,
        images,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${monument.name} | ${siteName}`,
        description,
        images: images.map((img) => (typeof img === 'string' ? img : img.url)),
      },
    };
  } catch {
    return { title: 'Monumento', robots: { index: false, follow: true } };
  }
}

export default async function MonumentPage({ params }: RouteProps) {
  const { id } = await params;
  let monument;
  try {
    monument = await getMonument(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const [history, quiz] = await Promise.all([getHistoricalData(id), getQuizByMonument(id)]);
  const monumentUrl = absoluteUrl(`/monumentos/${encodeURIComponent(id)}`);
  const address = [monument.location.address, monument.location.district].filter(Boolean).join(', ');

  return (
    <div className="flutter-screen detail-screen">
      <JsonLd data={[
        {
          '@context': 'https://schema.org',
          '@type': 'TouristAttraction',
          name: monument.name,
          description: seoDescription(monument.description),
          url: monumentUrl,
          mainEntityOfPage: monumentUrl,
          image: monument.imageUrl ? [monument.imageUrl] : [defaultOgImage.url],
          address: address ? {
            '@type': 'PostalAddress',
            streetAddress: monument.location.address ?? '',
            addressLocality: monument.location.district ?? '',
            addressCountry: 'PE',
          } : undefined,
          geo: monument.location.lat !== undefined && monument.location.lng !== undefined ? {
            '@type': 'GeoCoordinates',
            latitude: monument.location.lat,
            longitude: monument.location.lng,
          } : undefined,
          isAccessibleForFree: true,
          publicAccess: true,
          inLanguage: 'es-PE',
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: siteUrl },
            { '@type': 'ListItem', position: 2, name: 'Explorar', item: absoluteUrl('/explorar') },
            { '@type': 'ListItem', position: 3, name: monument.name, item: monumentUrl },
          ],
        },
      ]} />
      <AppHeader backHref="/explorar" />
      <div className="page-with-ad-space">
        <aside className="ad-gutter ad-gutter-left" aria-hidden="true">
          <AdBanner />
        </aside>
        <article className="page detail">
          {monument.imageUrl && (
            <Image
              className="hero-image"
              src={monument.imageUrl}
              alt={`Vista de ${monument.name}`}
              width={1200}
              height={675}
              sizes="(max-width: 899px) 100vw, calc(100vw - 360px)"
              priority
              unoptimized
            />
          )}
          <div>
            <h1>{monument.name}</h1>
            {monument.location.district && <p className="district">{monument.location.district}</p>}
            <p className="detail-description">{monument.description || 'Información histórica en preparación.'}</p>
          </div>
          <div className="detail-grid">
            <section className="plain-section">
              <h2>Modelo 3D</h2>
              <MonumentModelViewer src={monument.model3DUrl} name={monument.name} />
              <p>Para visualizarlo en realidad aumentada, usa la aplicación móvil de HistoriAR.</p>
            </section>
            <section className="plain-section">
              <h2>Información histórica</h2>
              <HistoricalSection entries={history} />
            </section>
          </div>
          {quiz && (
            <section className="quiz-promo">
              <div className="quiz-promo-title">
                <CircleHelp size={28} />
                <strong>Quiz Educativo Disponible</strong>
              </div>
              <p>Pon a prueba tus conocimientos sobre {monument.name} respondiendo este quiz.</p>
              <p className="muted">Puedes realizarlo aquí mismo, sin instalar la aplicación móvil.</p>
              <Link className="primary-button" href={`/monumentos/${id}/quiz`}>
                <PlayCircle size={18} /> Realizar quiz en la web
              </Link>
            </section>
          )}
          <AppFooter />
        </article>
        <aside className="ad-gutter ad-gutter-right" aria-hidden="true">
          <AdBanner />
        </aside>
      </div>
    </div>
  );
}

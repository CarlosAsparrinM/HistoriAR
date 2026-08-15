import type { Metadata } from 'next';
import { ExploreClient } from '@/components/explore/explore-client';
import { AppFooter } from '@/components/layout/app-footer';
import { AppHeader } from '@/components/layout/app-header';
import { getMonuments } from '@/lib/api/server';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl, defaultKeywords, defaultOgImage, siteDescription, siteName, siteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { q } = await searchParams;
  const queryText = q?.trim();
  const hasSearch = Boolean(queryText);
  const title = hasSearch ? `Resultados para “${queryText}”` : 'Explora monumentos del Perú';
  const description = hasSearch
    ? `Explora monumentos y patrimonio histórico relacionados con “${queryText}” en HistoriAR.`
    : siteDescription;

  return {
    title,
    description,
    keywords: defaultKeywords,
    alternates: { canonical: '/explorar' },
    robots: hasSearch ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: `${title} | ${siteName}`,
      description,
      url: '/explorar',
      type: 'website',
      images: [defaultOgImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteName}`,
      description,
      images: [defaultOgImage.url],
    },
  };
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const initialData = await getMonuments({ text: q });

  return (
    <div className="flutter-screen explore-screen">
      <JsonLd data={[
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Explora monumentos del Perú',
          url: absoluteUrl('/explorar'),
          description: siteDescription,
          inLanguage: 'es-PE',
          isPartOf: { '@type': 'WebSite', name: siteName, url: siteUrl },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: siteUrl },
            { '@type': 'ListItem', position: 2, name: 'Explorar', item: absoluteUrl('/explorar') },
          ],
        },
        {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Monumentos y sitios históricos del Perú',
          numberOfItems: initialData.total,
          itemListElement: initialData.items.map((monument, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: monument.name,
            url: absoluteUrl(`/monumentos/${encodeURIComponent(monument._id)}`),
            image: monument.imageUrl ?? undefined,
          })),
        },
      ]} />
      <AppHeader />
      <div className="explore-body">
        <ExploreClient key={q} initialData={initialData} initialText={q} />
      </div>
      <AppFooter />
    </div>
  );
}

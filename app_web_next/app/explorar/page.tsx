import type { Metadata } from 'next';
import { ExploreClient } from '@/components/explore/explore-client';
import { AppFooter } from '@/components/layout/app-footer';
import { AppHeader } from '@/components/layout/app-header';
import { getMonuments } from '@/lib/api/server';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl, siteDescription } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { q } = await searchParams;
  const hasSearch = Boolean(q?.trim());
  const title = hasSearch ? `Resultados para “${q?.trim()}”` : 'Explora monumentos del Perú';

  return {
    title,
    description: siteDescription,
    alternates: { canonical: '/explorar' },
    robots: hasSearch ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { title, description: siteDescription, url: '/explorar', type: 'website', images: [] },
    twitter: { card: 'summary', title, description: siteDescription, images: [] },
  };
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const initialData = await getMonuments({ text: q });
  return <div className="flutter-screen explore-screen">
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Monumentos y sitios históricos del Perú', numberOfItems: initialData.total, itemListElement: initialData.items.map((monument, index) => ({ '@type': 'ListItem', position: index + 1, name: monument.name, url: absoluteUrl(`/monumentos/${encodeURIComponent(monument._id)}`) })) }} />
    <AppHeader /><div className="explore-body"><ExploreClient initialData={initialData} initialText={q} /></div><AppFooter />
  </div>;
}

import type { MetadataRoute } from 'next';
import { getMonuments } from '@/lib/api/server';
import { absoluteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const staticEntries: MetadataRoute.Sitemap = [
  { url: absoluteUrl('/explorar'), changeFrequency: 'daily', priority: 1 },
  { url: absoluteUrl('/legal/privacidad'), changeFrequency: 'yearly', priority: 0.2 },
  { url: absoluteUrl('/legal/terminos'), changeFrequency: 'yearly', priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const monumentEntries: MetadataRoute.Sitemap = [];
  let page = 1;

  try {
    while (monumentEntries.length < 49_000) {
      const result = await getMonuments({ page });
      monumentEntries.push(...result.items.map((monument) => ({
        url: absoluteUrl(`/monumentos/${encodeURIComponent(monument._id)}`),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        images: monument.imageUrl ? [monument.imageUrl] : undefined,
      })));
      if (result.items.length === 0 || monumentEntries.length >= result.total) break;
      page += 1;
    }
  } catch {
    // El sitemap base sigue disponible si el catálogo está temporalmente fuera de línea.
  }

  return [...staticEntries, ...monumentEntries];
}

import type { MetadataRoute } from 'next';
import { getMonuments } from '@/lib/api/server';
import { absoluteUrl } from '@/lib/seo';

// Revalidar el sitemap cada hora para optimizar el rendimiento y no sobrecargar la API
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/explorar'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: absoluteUrl('/legal/privacidad'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/legal/terminos'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  const monumentEntries: MetadataRoute.Sitemap = [];
  let page = 1;

  try {
    while (monumentEntries.length < 49_000) {
      const result = await getMonuments({ page });
      if (!result?.items || result.items.length === 0) break;

      monumentEntries.push(...result.items.map((monument) => ({
        url: absoluteUrl(`/monumentos/${encodeURIComponent(monument._id)}`),
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        images: monument.imageUrl ? [monument.imageUrl] : undefined,
      })));

      if (monumentEntries.length >= result.total) break;
      page += 1;
    }
  } catch {
    // El sitemap estático base permanece disponible si el catálogo está temporalmente inaccesible.
  }

  return [...staticEntries, ...monumentEntries];
}


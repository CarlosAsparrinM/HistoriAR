const DEFAULT_SITE_URL = 'http://localhost:3005';

function normalizeSiteUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return undefined;
  }
}

export const siteUrl = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL
    ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
    ?? process.env.VERCEL_URL,
) ?? DEFAULT_SITE_URL;

export const siteName = 'HistoriAR';
export const siteDescription = 'Explora monumentos, historia y patrimonio cultural del Perú con mapas, modelos 3D y experiencias educativas.';

export function absoluteUrl(path: string): string {
  return new URL(path, `${siteUrl}/`).toString();
}

export function seoDescription(value: string | undefined, fallback = siteDescription): string {
  const normalized = value?.replace(/\s+/g, ' ').trim() || fallback;
  return normalized.length <= 160 ? normalized : `${normalized.slice(0, 157).trimEnd()}…`;
}

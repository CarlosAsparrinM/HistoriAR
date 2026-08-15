const apiUrlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

function normalizeApiBaseUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\/+$/, '');
  return apiUrlPattern.test(normalized) ? normalized : undefined;
}

export const serverApiBaseUrl = normalizeApiBaseUrl(
  process.env.HISTORIAR_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL,
);

export const browserApiBaseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
export const googlePlayUrl = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL
  ?? 'https://play.google.com/store/apps/details?id=com.historiar.app';
export const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';

export function requireServerApiBaseUrl(): string {
  if (!serverApiBaseUrl) {
    throw new Error('HISTORIAR_API_BASE_URL no está configurada o no es una URL válida.');
  }
  return serverApiBaseUrl;
}

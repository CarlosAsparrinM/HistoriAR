import { ApiError } from '@/lib/api/errors';
import { monumentListSchema, quizResultSchema, type MonumentList, type QuizResult } from '@/lib/api/schemas';
import { browserApiBaseUrl } from '@/lib/env';

function requireBrowserApiBaseUrl(): string {
  if (!browserApiBaseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL no está configurada o no es una URL válida.');
  }
  return browserApiBaseUrl;
}

async function browserJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    throw new ApiError(payload?.message ?? `La API respondió con estado ${response.status}.`, response.status);
  }
  return response.json();
}

export async function searchMonuments(text: string, page = 1): Promise<MonumentList> {
  const query = new URLSearchParams({ page: String(page), limit: '24' });
  if (text.trim()) query.set('text', text.trim());
  return monumentListSchema.parse(await browserJson(`${requireBrowserApiBaseUrl()}/monuments?${query}`));
}

export async function evaluateQuiz(
  quizId: string,
  answers: Array<{ questionIndex: number; selectedOptionIndex: number }>,
  timeSpent: number,
): Promise<QuizResult> {
  return quizResultSchema.parse(await browserJson(
    `${requireBrowserApiBaseUrl()}/quizzes/${encodeURIComponent(quizId)}/evaluate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, timeSpent }),
    },
  ));
}

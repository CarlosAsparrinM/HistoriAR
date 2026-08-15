import 'server-only';

import { z } from 'zod';

import { ApiError } from '@/lib/api/errors';
import {
  historicalEntrySchema,
  monumentListSchema,
  monumentSchema,
  quizListSchema,
  quizSchema,
  type HistoricalEntry,
  type Monument,
  type MonumentList,
  type Quiz,
} from '@/lib/api/schemas';
import { requireServerApiBaseUrl } from '@/lib/env';

async function getJson<TSchema extends z.ZodTypeAny>(path: string, schema: TSchema): Promise<z.output<TSchema>> {
  const response = await fetch(`${requireServerApiBaseUrl()}${path}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new ApiError(`La API respondió con estado ${response.status}.`, response.status);
  }
  return schema.parse(await response.json());
}

export async function getMonuments(params: { page?: number; text?: string } = {}): Promise<MonumentList> {
  const query = new URLSearchParams({ page: String(params.page ?? 1), limit: '24' });
  if (params.text?.trim()) query.set('text', params.text.trim());
  return getJson(`/monuments?${query}`, monumentListSchema);
}

export function getMonument(id: string): Promise<Monument> {
  return getJson(`/monuments/${encodeURIComponent(id)}`, monumentSchema);
}

export function getHistoricalData(id: string): Promise<HistoricalEntry[]> {
  return getJson(
    `/monuments/${encodeURIComponent(id)}/historical-data/public`,
    z.array(historicalEntrySchema),
  );
}

export async function getQuizByMonument(monumentId: string): Promise<Quiz | null> {
  const query = new URLSearchParams({ monumentId, limit: '1' });
  const list = await getJson(`/quizzes?${query}`, quizListSchema);
  return list.items[0] ?? null;
}

export function getQuiz(id: string): Promise<Quiz> {
  return getJson(`/quizzes/${encodeURIComponent(id)}`, quizSchema);
}

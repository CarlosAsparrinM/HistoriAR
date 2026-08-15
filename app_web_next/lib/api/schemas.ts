import { z } from 'zod';

const idSchema = z.string().min(1);
const nullableText = z.string().nullable().optional().transform((value) => value ?? undefined);

export const monumentSchema = z.object({
  _id: idSchema,
  name: z.string().min(1).catch('Monumento sin nombre'),
  description: z.string().catch(''),
  location: z.object({
    lat: z.number().finite().optional(),
    lng: z.number().finite().optional(),
    address: nullableText,
    district: nullableText,
  }).default({}),
  culture: nullableText,
  cultures: z.array(z.string()).optional(),
  imageUrl: nullableText,
  model3DUrl: nullableText,
});

export const monumentListSchema = z.object({
  page: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  items: z.array(monumentSchema),
});

export const historicalEntrySchema = z.object({
  id: idSchema,
  title: z.string().min(1).catch('Sin título'),
  description: z.string().catch(''),
  imageUrl: nullableText,
  discoveryInfo: z.string().catch(''),
  activities: z.array(z.string()).catch([]),
  sources: z.array(z.string()).catch([]),
  order: z.number().int().catch(0),
});

export const quizSchema = z.object({
  _id: idSchema,
  monumentId: z.union([idSchema, z.object({ _id: idSchema })]),
  title: z.string().min(1),
  description: z.string().catch(''),
  questions: z.array(z.object({
    questionText: z.string().min(1),
    options: z.array(z.object({ text: z.string().min(1) })).min(2),
  })).min(1),
});

export const quizListSchema = z.object({
  page: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  items: z.array(quizSchema),
});

export const quizResultSchema = z.object({
  score: z.number().int().nonnegative(),
  maxScore: z.number().int().nonnegative(),
  percentage: z.number().finite(),
  review: z.array(z.object({
    questionIndex: z.number().int().nonnegative(),
    selectedOptionIndex: z.number().int().nonnegative().nullable().optional(),
    isCorrect: z.boolean(),
    explanation: z.string().optional().default(''),
  })),
});

export type Monument = z.infer<typeof monumentSchema>;
export type MonumentList = z.infer<typeof monumentListSchema>;
export type HistoricalEntry = z.infer<typeof historicalEntrySchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type QuizResult = z.infer<typeof quizResultSchema>;

import { describe, expect, it } from 'vitest';

import { monumentListSchema, quizSchema } from '@/lib/api/schemas';

describe('contratos públicos', () => {
  it('acepta un catálogo con medios firmados y coordenadas opcionales', () => {
    const parsed = monumentListSchema.parse({ page: 1, total: 1, items: [{ _id: '507f1f77bcf86cd799439011', name: 'Huaca', description: 'Descripción', location: { lat: -12.04, lng: -77.03, district: 'Lima' }, imageUrl: 'https://s3.example/image?signature=temp' }] });
    expect(parsed.items[0].location.district).toBe('Lima');
  });

  it('descarta campos de respuesta correcta recibidos por error', () => {
    const quiz = quizSchema.parse({ _id: 'quiz-1', monumentId: '507f1f77bcf86cd799439011', title: 'Quiz', questions: [{ questionText: 'Pregunta', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] }] });
    expect(quiz.questions[0].options[0]).not.toHaveProperty('isCorrect');
  });
});

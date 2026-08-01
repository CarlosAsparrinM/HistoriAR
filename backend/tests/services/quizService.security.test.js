import { beforeEach, describe, expect, it, vi } from 'vitest';

import Quiz from '../../src/models/Quiz.js';
import QuizAttempt from '../../src/models/QuizAttempt.js';
import { processQuizAnswers, submitQuizAttempt } from '../../src/services/quizService.js';

const quiz = {
  _id: 'quiz-1',
  monumentId: '507f1f77bcf86cd799439011',
  questions: [
    {
      questionText: 'Pregunta 1',
      options: [
        { text: 'A', isCorrect: false },
        { text: 'B', isCorrect: true },
      ],
      explanation: 'B es correcta',
    },
    {
      questionText: 'Pregunta 2',
      options: [
        { text: 'A', isCorrect: true },
        { text: 'B', isCorrect: false },
      ],
      explanation: 'A es correcta',
    },
  ],
};

describe('quizService security', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('evalúa en el servidor y solo revela la solución en la revisión final', () => {
    const result = processQuizAnswers(quiz, [
      { questionIndex: 0, selectedOptionIndex: 1 },
      { questionIndex: 1, selectedOptionIndex: 1 },
    ]);

    expect(result.correctAnswers).toBe(1);
    expect(result.processedAnswers).toEqual([
      { questionIndex: 0, selectedOptionIndex: 1, isCorrect: true },
      { questionIndex: 1, selectedOptionIndex: 1, isCorrect: false },
    ]);
    expect(result.review[0]).toMatchObject({
      correctOptionIndex: 1,
      explanation: 'B es correcta',
    });
  });

  it.each([
    [[{ questionIndex: 0, selectedOptionIndex: 0 }], 'todas las preguntas'],
    [[
      { questionIndex: 0, selectedOptionIndex: 0 },
      { questionIndex: 0, selectedOptionIndex: 1 },
    ], 'solo puede responderse una vez'],
    [[
      { questionIndex: 0, selectedOptionIndex: 99 },
      { questionIndex: 1, selectedOptionIndex: 0 },
    ], 'opción inválido'],
  ])('rechaza intentos incompletos, duplicados o fuera de rango', (answers, message) => {
    expect(() => processQuizAnswers(quiz, answers)).toThrow(message);
  });

  it('solo permite enviar intentos de quizzes activos y normaliza la respuesta', async () => {
    vi.spyOn(Quiz, 'findOne').mockResolvedValue(quiz);
    vi.spyOn(QuizAttempt.prototype, 'save').mockImplementation(async function save() {
      return this;
    });

    const result = await submitQuizAttempt('507f1f77bcf86cd799439012', 'quiz-1', [
      { questionIndex: 0, selectedOptionIndex: 1 },
      { questionIndex: 1, selectedOptionIndex: 0 },
    ], 12.6);

    expect(Quiz.findOne).toHaveBeenCalledWith({ _id: 'quiz-1', isActive: true });
    expect(result).toMatchObject({ score: 2, maxScore: 2, percentage: 100 });
    expect(result.review).toHaveLength(2);
  });
});

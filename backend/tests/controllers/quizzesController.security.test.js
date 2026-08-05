import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/quizService.js', () => ({
  createQuiz: vi.fn(),
  deleteQuiz: vi.fn(),
  getAllQuizzes: vi.fn(),
  getAllUserAttempts: vi.fn(),
  getQuizAttempts: vi.fn(),
  getQuizById: vi.fn(),
  getUserAttempts: vi.fn(),
  submitQuizAttempt: vi.fn(),
  updateQuiz: vi.fn(),
}));

const service = await import('../../src/services/quizService.js');
const controller = await import('../../src/controllers/quizzesController.js');

function mockRes() {
  const res = { json: vi.fn() };
  res.status = vi.fn(() => res);
  return res;
}

const fullQuiz = {
  _id: 'quiz-1',
  monumentId: 'monument-1',
  title: 'Quiz',
  description: 'Descripción',
  isActive: true,
  questions: [{
    questionText: 'Pregunta',
    explanation: 'Explicación secreta',
    options: [
      { text: 'A', isCorrect: true },
      { text: 'B', isCorrect: false },
    ],
  }],
};

describe('quizzesController public contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('elimina respuestas y explicaciones del DTO público', () => {
    const publicQuiz = controller.toPublicQuiz(fullQuiz);
    expect(publicQuiz.questions[0]).toEqual({
      questionText: 'Pregunta',
      options: [{ text: 'A' }, { text: 'B' }],
    });
    expect(JSON.stringify(publicQuiz)).not.toContain('isCorrect');
    expect(JSON.stringify(publicQuiz)).not.toContain('Explicación secreta');
  });

  it('lista únicamente quizzes activos y sanitiza cada documento', async () => {
    service.getAllQuizzes.mockResolvedValue({ items: [fullQuiz], total: 1 });
    const req = { query: {} };
    const res = mockRes();

    await controller.listQuiz(req, res);

    expect(service.getAllQuizzes).toHaveBeenCalledWith(
      { isActive: true },
      expect.any(Object),
    );
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('isCorrect');
  });

  it('mantiene el contrato completo únicamente en el controlador admin', async () => {
    service.getAllQuizzes.mockResolvedValue({ items: [fullQuiz], total: 1 });
    const req = { query: {} };
    const res = mockRes();

    await controller.listQuizAdmin(req, res);

    expect(service.getAllQuizzes).toHaveBeenCalledWith({}, expect.any(Object));
    expect(res.json.mock.calls[0][0].items[0].questions[0].options[0].isCorrect).toBe(true);
  });

  it('devuelve los intentos del usuario autenticado en getMyAttemptsController', async () => {
    const attemptsMock = [
      {
        _id: 'att-1',
        quizId: { _id: 'q-1', title: 'Quiz Machupicchu' },
        monumentId: { _id: 'm-1', name: 'Machupicchu' },
        correctAnswers: 3,
        totalQuestions: 3,
        percentageScore: 100,
        timeSpent: 45,
        completedAt: new Date('2026-08-05'),
      },
    ];
    service.getAllUserAttempts.mockResolvedValue(attemptsMock);
    const req = { user: { id: 'user-123' } };
    const res = mockRes();

    await controller.getMyAttemptsController(req, res);

    expect(service.getAllUserAttempts).toHaveBeenCalledWith('user-123');
    expect(res.json).toHaveBeenCalledWith({
      total: 1,
      items: [
        {
          _id: 'att-1',
          quizId: 'q-1',
          quizTitle: 'Quiz Machupicchu',
          monumentId: 'm-1',
          monumentName: 'Machupicchu',
          correctAnswers: 3,
          totalQuestions: 3,
          percentageScore: 100,
          timeSpent: 45,
          completedAt: expect.any(Date),
        },
      ],
    });
  });
});


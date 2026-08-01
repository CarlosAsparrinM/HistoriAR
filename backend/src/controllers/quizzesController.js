import {
  createQuiz,
  deleteQuiz,
  getAllQuizzes,
  getAllUserAttempts,
  getQuizAttempts,
  getQuizById,
  getUserAttempts,
  submitQuizAttempt,
  updateQuiz,
} from '../services/quizService.js';
import { buildPagination } from '../utils/pagination.js';

export function toPublicQuiz(source) {
  const quiz = typeof source?.toObject === 'function' ? source.toObject() : source;
  if (!quiz) return quiz;

  return {
    _id: quiz._id,
    monumentId: quiz.monumentId,
    title: quiz.title,
    description: quiz.description,
    questions: (quiz.questions || []).map((question) => ({
      questionText: question.questionText,
      options: (question.options || []).map((option) => ({ text: option.text }))
    }))
  };
}

export async function listQuiz(req, res) {
  try {
    const { skip, limit, page } = buildPagination(req.query);
    const filter = { isActive: true };
    if (req.query.monumentId) filter.monumentId = req.query.monumentId;
    const { items, total } = await getAllQuizzes(filter, { skip, limit });
    res.json({ page, total, items: items.map(toPublicQuiz) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getQuiz(req, res) {
  const doc = await getQuizById(req.params.id);
  if (!doc || doc.isActive !== true) return res.status(404).json({ message: 'No encontrado' });
  res.json(toPublicQuiz(doc));
}

export async function listQuizAdmin(req, res) {
  try {
    const { skip, limit, page } = buildPagination(req.query);
    const filter = {};
    if (req.query.monumentId) filter.monumentId = req.query.monumentId;
    if (req.query.isActive === 'true' || req.query.isActive === 'false') {
      filter.isActive = req.query.isActive === 'true';
    }
    const { items, total } = await getAllQuizzes(filter, { skip, limit });
    res.json({ page, total, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getQuizAdmin(req, res) {
  const doc = await getQuizById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'No encontrado' });
  res.json(doc);
}

export async function createQuizController(req, res) {
  try {
    const doc = await createQuiz(req.body);
    res.status(201).json({ id: doc._id });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function updateQuizController(req, res) {
  try {
    const doc = await updateQuiz(req.params.id, req.body);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function deleteQuizController(req, res) {
  const doc = await deleteQuiz(req.params.id);
  if (!doc) return res.status(404).json({ message: 'No encontrado' });
  res.json({ message: 'Eliminado' });
}

/**
 * Enviar intento de quiz
 */
export async function submitQuizAttemptController(req, res) {
  try {
    // El middleware verifyToken normaliza el usuario como req.user.id
    const userId = req.user?.id;
    const { answers, timeSpent } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Answers array is required' });
    }

    const attempt = await submitQuizAttempt(userId, req.params.id, answers, timeSpent);
    res.status(201).json(attempt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

/**
 * Obtener intentos de un quiz específico
 */
export async function getQuizAttemptsController(req, res) {
  try {
    const attempts = await getQuizAttempts(req.params.id);
    res.json({ total: attempts.length, items: attempts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Obtener intentos de un usuario para un quiz
 */
export async function getUserQuizAttemptsController(req, res) {
  try {
    const attempts = await getUserAttempts(req.params.userId, req.params.quizId);
    res.json({ total: attempts.length, items: attempts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Obtener todos los intentos de un usuario
 */
export async function getAllUserAttemptsController(req, res) {
  try {
    if (req.user?.id !== req.params.userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const attempts = await getAllUserAttempts(req.params.userId);
    res.json({ total: attempts.length, items: attempts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

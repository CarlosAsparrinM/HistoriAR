/**
 * Controlador de Quizzes
 * Refactorizado parcialmente usando crudControllerFactory
 * Mantiene métodos específicos de evaluación y attempts
 */
import { createCrudController } from '../utils/crudControllerFactory.js';
import * as quizService from '../services/quizService.js';

// Crear controlador CRUD básico usando el factory
const crudController = createCrudController({
  service: {
    getAll: (options) => quizService.getAllQuizzes(
      options.monumentId ? { monumentId: options.monumentId } : {},
      { skip: options.skip, limit: options.limit }
    ),
    getById: quizService.getQuizById,
    create: quizService.createQuiz,
    update: quizService.updateQuiz,
    delete: quizService.deleteQuiz
  },
  entityName: 'Quiz',
  entityNamePlural: 'Quizzes',
  listOptions: {
    customFilters: {
      monumentId: true
    }
  }
});

// Exportar métodos CRUD estándar
export const {
  list: listQuiz,
  getById: getQuiz,
  create: createQuizController,
  update: updateQuizController,
  deleteItem: deleteQuizController
} = crudController;

// Métodos específicos de Quiz (evaluación y attempts)

/**
 * Evaluar respuestas de un quiz
 */
export async function evaluateQuizController(req, res) {
  try {
    const { answers } = req.body; // array de índices
    const result = await quizService.evaluateQuiz(req.params.id, answers || []);
    res.json(result);
  } catch (err) { 
    res.status(400).json({ message: err.message }); 
  }
}

/**
 * Enviar intento de quiz
 */
export async function submitQuizAttemptController(req, res) {
  try {
    const userId = req.user?.id;
    const { answers, timeSpent } = req.body;
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Answers array is required' });
    }
    
    const attempt = await quizService.submitQuizAttempt(userId, req.params.id, answers, timeSpent);
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
    const attempts = await quizService.getQuizAttempts(req.params.id);
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
    const attempts = await quizService.getUserAttempts(req.params.userId, req.params.quizId);
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
    const attempts = await quizService.getAllUserAttempts(req.params.userId);
    res.json({ total: attempts.length, items: attempts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

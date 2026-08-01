import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';

export async function getAllQuizzes(filter = {}, { skip = 0, limit = 10 } = {}) {
  const [items, total] = await Promise.all([
    Quiz.find(filter).skip(skip).limit(limit),
    Quiz.countDocuments(filter)
  ]);
  return { items, total };
}

export async function getQuizById(id) {
  return await Quiz.findById(id);
}

export async function createQuiz(data) {
  return await Quiz.create(data);
}

export async function updateQuiz(id, data) {
  return await Quiz.findByIdAndUpdate(id, data, { new: true, runValidators: true });
}

export async function deleteQuiz(id) {
  return await Quiz.findByIdAndDelete(id);
}

export function processQuizAnswers(quiz, answers) {
  if (!Array.isArray(answers)) {
    throw new Error('Answers array is required');
  }

  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  if (questions.length === 0 || answers.length !== questions.length) {
    throw new Error('Debe responder todas las preguntas exactamente una vez');
  }

  const seenQuestions = new Set();
  let correctAnswers = 0;
  const processedAnswers = [];
  const review = [];

  for (const answer of answers) {
    const questionIndex = answer?.questionIndex;
    const selectedOptionIndex = answer?.selectedOptionIndex;

    if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= questions.length) {
      throw new Error('Índice de pregunta inválido');
    }
    if (seenQuestions.has(questionIndex)) {
      throw new Error('Cada pregunta solo puede responderse una vez');
    }

    const question = questions[questionIndex];
    const options = Array.isArray(question.options) ? question.options : [];
    if (!Number.isInteger(selectedOptionIndex)
        || selectedOptionIndex < 0
        || selectedOptionIndex >= options.length) {
      throw new Error('Índice de opción inválido');
    }

    const correctOptionIndex = options.findIndex((option) => option.isCorrect === true);
    if (correctOptionIndex < 0) {
      throw new Error('El quiz contiene una pregunta sin respuesta correcta');
    }

    const isCorrect = selectedOptionIndex === correctOptionIndex;
    if (isCorrect) correctAnswers += 1;
    seenQuestions.add(questionIndex);
    processedAnswers.push({ questionIndex, selectedOptionIndex, isCorrect });
    review.push({
      questionIndex,
      selectedOptionIndex,
      correctOptionIndex,
      isCorrect,
      explanation: question.explanation || ''
    });
  }

  processedAnswers.sort((a, b) => a.questionIndex - b.questionIndex);
  review.sort((a, b) => a.questionIndex - b.questionIndex);
  return { correctAnswers, processedAnswers, review };
}

/**
 * Registrar intento de quiz
 * @param {string} userId - ID del usuario
 * @param {string} quizId - ID del quiz
 * @param {Array} answers - Array de respuestas [{questionIndex, selectedOptionIndex}]
 * @param {number} timeSpent - Tiempo en segundos
 * @returns {Promise<Object>} QuizAttempt creado
 */
export async function submitQuizAttempt(userId, quizId, answers, timeSpent) {
  const quiz = await Quiz.findOne({ _id: quizId, isActive: true });
  if (!quiz) throw new Error('Quiz no encontrado o inactivo');

  const normalizedTimeSpent = Number.isFinite(timeSpent) && timeSpent >= 0
    ? Math.round(timeSpent)
    : undefined;
  const { correctAnswers, processedAnswers, review } = processQuizAnswers(quiz, answers);
  const totalQuestions = quiz.questions.length;
  const percentageScore = Math.round((correctAnswers / totalQuestions) * 100);
  const attempt = new QuizAttempt({
    userId,
    quizId,
    monumentId: quiz.monumentId,
    answers: processedAnswers,
    correctAnswers,
    totalQuestions,
    percentageScore,
    timeSpent: normalizedTimeSpent
  });
  const savedAttempt = await attempt.save();

  return {
    _id: savedAttempt._id,
    score: correctAnswers,
    maxScore: totalQuestions,
    percentage: percentageScore,
    correctAnswers,
    totalQuestions,
    percentageScore,
    timeSpent: savedAttempt.timeSpent,
    completedAt: savedAttempt.completedAt,
    review
  };
}

/**
 * Obtener intentos de usuario para un quiz
 * @param {string} userId - ID del usuario
 * @param {string} quizId - ID del quiz
 * @returns {Promise<Array>} Array de intentos
 */
export async function getUserAttempts(userId, quizId) {
  try {
    return await QuizAttempt.find({ userId, quizId })
      .sort({ completedAt: -1 });
  } catch (error) {
    console.error('Error getting user attempts:', error);
    throw new Error(`Failed to get user attempts: ${error.message}`);
  }
}

/**
 * Obtener todos los intentos de un quiz
 * @param {string} quizId - ID del quiz
 * @returns {Promise<Array>} Array de intentos con datos de usuario
 */
export async function getQuizAttempts(quizId) {
  try {
    return await QuizAttempt.find({ quizId })
      .populate('userId', 'name email')
      .sort({ completedAt: -1 });
  } catch (error) {
    console.error('Error getting quiz attempts:', error);
    throw new Error(`Failed to get quiz attempts: ${error.message}`);
  }
}

/**
 * Obtener todos los intentos de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} Array de intentos con datos de quiz
 */
export async function getAllUserAttempts(userId) {
  try {
    return await QuizAttempt.find({ userId })
      .populate('quizId', 'title')
      .populate('monumentId', 'name')
      .sort({ completedAt: -1 });
  } catch (error) {
    console.error('Error getting all user attempts:', error);
    throw new Error(`Failed to get user attempts: ${error.message}`);
  }
}

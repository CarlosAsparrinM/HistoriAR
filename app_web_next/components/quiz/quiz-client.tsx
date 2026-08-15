'use client';

import Link from 'next/link';
import { Brain, Star } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { evaluateQuiz } from '@/lib/api/browser';
import type { Quiz, QuizResult } from '@/lib/api/schemas';

export function QuizClient({ quiz, monumentId }: { quiz: Quiz; monumentId: string }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [startedAt] = useState(() => Date.now());
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const complete = Object.keys(answers).length === quiz.questions.length;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!complete) { setError('Por favor, responde todas las preguntas antes de enviar.'); return; }
    setSubmitting(true); setError(null);
    try {
      const evaluation = await evaluateQuiz(quiz._id, Object.entries(answers).map(([questionIndex, selectedOptionIndex]) => ({ questionIndex: Number(questionIndex), selectedOptionIndex })), Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
      setResult(evaluation);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo evaluar el cuestionario.'); } finally { setSubmitting(false); }
  }

  if (result) return <section className="section-card quiz quiz-result">{result.percentage >= 70 ? <Star className="result-icon success" size={64} /> : <Brain className="result-icon" size={64} />}<h1>¡Quiz Completado!</h1><p className="score">Puntaje obtenido: {result.score} de {result.maxScore} ({result.percentage}%)</p><h2>Retroalimentación:</h2>{result.review.map((item) => <article className={item.isCorrect ? 'history-entry review-correct' : 'history-entry review-incorrect'} key={item.questionIndex}><strong>Pregunta {item.questionIndex + 1}: {item.isCorrect ? 'Correcta' : 'Incorrecta'}</strong>{item.explanation && <p>{item.explanation}</p>}</article>)}<Link className="primary-button" href={`/monumentos/${monumentId}`}>Volver al Monumento</Link></section>;
  return <form className="section-card quiz" onSubmit={submit}><h1>{quiz.title}</h1>{quiz.description && <p>{quiz.description}</p>}{error && <p className="quiz-error" role="alert">{error}</p>}{quiz.questions.map((question, index) => <fieldset className="question" key={index}><legend><strong>{index + 1}. {question.questionText}</strong></legend>{question.options.map((option, optionIndex) => <label className="option" key={optionIndex}><input type="radio" name={`question-${index}`} checked={answers[index] === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))} />{option.text}</label>)}</fieldset>)}<button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Evaluando…' : 'Enviar Respuestas'}</button></form>;
}

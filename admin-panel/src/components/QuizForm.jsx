/**
 * Componente QuizForm
 * 
 * Formulario para crear o editar quizzes
 * Incluye constructor de preguntas con opciones múltiples
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import {
  Plus,
  X,
  Loader2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useCreateQuiz, useUpdateQuiz } from '../hooks/useQuizzes';

function QuizForm({ monumentId, monumentName, quiz = null, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: quiz?.title || '',
    description: quiz?.description || '',
    questions: quiz?.questions || [
      {
        questionText: '',
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ],
        explanation: ''
      }
    ]
  });
  
  const [error, setError] = useState(null);

  // React Query mutations
  const createMutation = useCreateQuiz();
  const updateMutation = useUpdateQuiz();
  
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isEditing = Boolean(quiz);

  // Handle input change
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Add new question
  const handleAddQuestion = () => {
    if (formData.questions.length >= 5) {
      setError('Máximo 5 preguntas por quiz');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          questionText: '',
          options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
          ],
          explanation: ''
        }
      ]
    }));
  };

  // Remove question
  const handleRemoveQuestion = (questionIndex) => {
    if (formData.questions.length <= 3) {
      setError('Mínimo 3 preguntas por quiz');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, idx) => idx !== questionIndex)
    }));
  };

  // Update question
  const handleQuestionChange = (questionIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, idx) =>
        idx === questionIndex ? { ...q, [field]: value } : q
      )
    }));
  };

  // Add option to question
  const handleAddOption = (questionIndex) => {
    const question = formData.questions[questionIndex];
    if (question.options.length >= 4) {
      setError('Máximo 4 opciones por pregunta');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, idx) =>
        idx === questionIndex
          ? { ...q, options: [...q.options, { text: '', isCorrect: false }] }
          : q
      )
    }));
  };

  // Remove option from question
  const handleRemoveOption = (questionIndex, optionIndex) => {
    const question = formData.questions[questionIndex];
    if (question.options.length <= 2) {
      setError('Mínimo 2 opciones por pregunta');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, idx) =>
        idx === questionIndex
          ? { ...q, options: q.options.filter((_, oIdx) => oIdx !== optionIndex) }
          : q
      )
    }));
  };

  // Update option
  const handleOptionChange = (questionIndex, optionIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, qIdx) =>
        qIdx === questionIndex
          ? {
              ...q,
              options: q.options.map((opt, oIdx) => {
                if (oIdx === optionIndex) {
                  // If marking as correct, unmark others
                  if (field === 'isCorrect' && value === true) {
                    return { ...opt, [field]: value };
                  }
                  return { ...opt, [field]: value };
                } else if (field === 'isCorrect' && value === true) {
                  // Unmark other options when one is marked correct
                  return { ...opt, isCorrect: false };
                }
                return opt;
              })
            }
          : q
      )
    }));
  };

  // Validate form
  const validateForm = () => {
    if (!formData.title.trim()) {
      return 'El título es obligatorio';
    }

    if (formData.questions.length < 3 || formData.questions.length > 5) {
      return 'El quiz debe tener entre 3 y 5 preguntas';
    }

    for (let i = 0; i < formData.questions.length; i++) {
      const question = formData.questions[i];
      
      if (!question.questionText.trim()) {
        return `La pregunta ${i + 1} no puede estar vacía`;
      }

      if (question.options.length < 2 || question.options.length > 4) {
        return `La pregunta ${i + 1} debe tener entre 2 y 4 opciones`;
      }

      const correctCount = question.options.filter(opt => opt.isCorrect).length;
      if (correctCount !== 1) {
        return `La pregunta ${i + 1} debe tener exactamente una respuesta correcta`;
      }

      for (let j = 0; j < question.options.length; j++) {
        if (!question.options[j].text.trim()) {
          return `La opción ${j + 1} de la pregunta ${i + 1} no puede estar vacía`;
        }
      }
    }

    return null;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    try {
      const quizData = {
        ...formData,
        monumentId,
        isActive: quiz?.isActive ?? true
      };

      if (isEditing) {
        await updateMutation.mutateAsync({
          quizId: quiz._id,
          data: quizData
        });
      } else {
        await createMutation.mutateAsync(quizData);
      }

      onSave();
    } catch (err) {
      console.error('Error saving quiz:', err);
      setError(err.message || 'Error al guardar el quiz');
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Quiz' : 'Nuevo Quiz'}</CardTitle>
        <p className="text-sm text-muted-foreground">Para: <strong>{monumentName}</strong></p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Title */}
          <div>
            <Label htmlFor="title">Título del Quiz *</Label>
            <Input
              id="title"
              placeholder="Ej: Historia de Machu Picchu"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Descripción breve del quiz..."
              rows={2}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Preguntas (3-5 requeridas)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddQuestion}
                disabled={isSubmitting || formData.questions.length >= 5}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Pregunta
              </Button>
            </div>

            {formData.questions.map((question, qIdx) => (
              <Card key={qIdx} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Pregunta {qIdx + 1}</h4>
                    {formData.questions.length > 3 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Question Text */}
                  <div>
                    <Label>Texto de la pregunta *</Label>
                    <Input
                      placeholder="Escribe la pregunta..."
                      value={question.questionText}
                      onChange={(e) => handleQuestionChange(qIdx, 'questionText', e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Opciones (2-4 requeridas)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddOption(qIdx)}
                        disabled={isSubmitting || question.options.length >= 4}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Opción
                      </Button>
                    </div>

                    {question.options.map((option, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <Checkbox
                          checked={option.isCorrect}
                          onCheckedChange={(checked) =>
                            handleOptionChange(qIdx, oIdx, 'isCorrect', checked)
                          }
                          disabled={isSubmitting}
                        />
                        <Input
                          placeholder={`Opción ${oIdx + 1}`}
                          value={option.text}
                          onChange={(e) =>
                            handleOptionChange(qIdx, oIdx, 'text', e.target.value)
                          }
                          disabled={isSubmitting}
                          className="flex-1"
                          required
                        />
                        {question.options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveOption(qIdx, oIdx)}
                            disabled={isSubmitting}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      Marca la casilla de la respuesta correcta
                    </p>
                  </div>

                  {/* Explanation */}
                  <div>
                    <Label>Explicación (opcional)</Label>
                    <Textarea
                      placeholder="Explica por qué esta es la respuesta correcta..."
                      rows={2}
                      value={question.explanation}
                      onChange={(e) => handleQuestionChange(qIdx, 'explanation', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                isEditing ? 'Actualizar Quiz' : 'Crear Quiz'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

QuizForm.propTypes = {
  monumentId: PropTypes.string.isRequired,
  monumentName: PropTypes.string.isRequired,
  quiz: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default QuizForm;

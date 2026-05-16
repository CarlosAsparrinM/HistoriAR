/**
 * Componente QuizEditor
 * 
 * Gestiona los quizzes de un monumento específico
 * Permite crear, editar, activar/desactivar y eliminar quizzes
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import PropTypes from 'prop-types';
import QuizForm from './QuizForm';
import { useQuizzesByMonument, useDeleteQuiz } from '../hooks/useQuizzes';
import apiService from '../services/api';

function QuizEditor({ monumentId, monumentName }) {
  const [notification, setNotification] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  
  // Deletion confirmation dialog state
  const [deletionDialog, setDeletionDialog] = useState({
    open: false,
    quizId: null,
    quizTitle: null
  });

  // Fetch quizzes using React Query
  const { data: quizzesData, isLoading } = useQuizzesByMonument(monumentId);
  const quizzes = quizzesData?.items || quizzesData || [];
  
  // Delete mutation
  const deleteQuizMutation = useDeleteQuiz();

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handle create new quiz
  const handleCreateClick = () => {
    setEditingQuiz(null);
    setShowForm(true);
  };

  // Handle edit quiz
  const handleEditClick = (quiz) => {
    setEditingQuiz(quiz);
    setShowForm(true);
  };

  // Handle form save - no need for manual re-fetch, React Query updates automatically
  const handleFormSave = () => {
    setShowForm(false);
    setEditingQuiz(null);
    showNotification('success', editingQuiz ? 'Quiz actualizado exitosamente' : 'Quiz creado exitosamente');
  };

  // Handle form cancel
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingQuiz(null);
  };

  // Toggle quiz active status
  const handleToggleActive = async (quiz) => {
    try {
      await apiService.updateQuiz(quiz._id, { isActive: !quiz.isActive });
      
      // Invalidate quizzes cache to trigger refetch
      showNotification('success', quiz.isActive ? 'Quiz desactivado' : 'Quiz activado');
    } catch (error) {
      console.error('Error toggling quiz:', error);
      showNotification('error', 'Error al cambiar estado del quiz');
    }
  };

  // Open deletion confirmation dialog
  const handleDeleteClick = (quiz) => {
    setDeletionDialog({
      open: true,
      quizId: quiz._id,
      quizTitle: quiz.title
    });
  };

  // Close deletion dialog
  const handleDeleteCancel = () => {
    setDeletionDialog({ open: false, quizId: null, quizTitle: null });
  };

  // Confirm and execute deletion
  const handleDeleteConfirm = async () => {
    const quizId = deletionDialog.quizId;
    
    try {
      setDeletionDialog({ open: false, quizId: null, quizTitle: null });
      
      await deleteQuizMutation.mutateAsync(quizId);
      
      showNotification('success', 'Quiz eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting quiz:', error);
      showNotification('error', error.message || 'Error al eliminar quiz');
    }
  };

  if (showForm) {
    return (
      <QuizForm
        monumentId={monumentId}
        monumentName={monumentName}
        quiz={editingQuiz}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <Alert variant={notification.type === 'error' ? 'destructive' : 'default'}>
          {notification.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}

      {/* Add Button */}
      <div>
        <Button onClick={handleCreateClick} className="gap-2">
          <Plus className="w-4 h-4" />
          Crear Nuevo Quiz
        </Button>
      </div>

      {/* Quizzes List */}
      <Card>
        <CardHeader>
          <CardTitle>Quizzes ({quizzes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay quizzes para este monumento</p>
              <p className="text-sm mt-1">Haz clic en "Crear Nuevo Quiz" para agregar el primero</p>
            </div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <div 
                  key={quiz._id} 
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{quiz.title}</h3>
                        {quiz.isActive ? (
                          <Badge variant="default" className="mt-1">Activo</Badge>
                        ) : (
                          <Badge variant="secondary" className="mt-1">Inactivo</Badge>
                        )}
                      </div>
                    </div>
                    {quiz.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {quiz.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {quiz.questions?.length || 0} preguntas
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(quiz)}
                      disabled={deleteQuizMutation.isPending}
                    >
                      {quiz.isActive ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(quiz)}
                      disabled={deleteQuizMutation.isPending}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(quiz)}
                      disabled={deleteQuizMutation.isPending}
                    >
                      {deleteQuizMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deletion Confirmation Dialog */}
      <AlertDialog open={deletionDialog.open} onOpenChange={(open) => !open && handleDeleteCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar permanentemente <strong>{deletionDialog.quizTitle}</strong>.
              {' '}<strong className="text-destructive">Esta acción no se puede deshacer.</strong>
              {' '}Todas las preguntas y respuestas asociadas serán eliminadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

QuizEditor.propTypes = {
  monumentId: PropTypes.string.isRequired,
  monumentName: PropTypes.string.isRequired,
};

export default QuizEditor;

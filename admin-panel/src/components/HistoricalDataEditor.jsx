/**
 * Componente HistoricalDataEditor
 * 
 * Gestiona las entradas de información histórica de un monumento específico
 * Permite crear, editar, eliminar y reordenar entradas
 * 
 * Usa React Query para sincronización automática sin refreshes bruscos
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
  FileText,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import PropTypes from 'prop-types';
import { ImageWithFallback } from './figma/ImageWithFallback';
import HistoricalDataForm from './HistoricalDataForm';
import {
  useHistoricalData,
  useDeleteHistoricalData,
  useReorderHistoricalData,
} from '../hooks/useHistoricalData';

function HistoricalDataEditor({ monumentId, monumentName }) {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [notification, setNotification] = useState(null);
  const [deletionDialog, setDeletionDialog] = useState({
    open: false,
    entryId: null,
    entryTitle: null
  });

  // Fetch historical data using React Query
  const { data: entries = [], isLoading, isError, error } = useHistoricalData(monumentId);

  // Mutations
  const deleteHistoricalDataMutation = useDeleteHistoricalData();
  const reorderHistoricalDataMutation = useReorderHistoricalData();

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handle create new entry
  const handleCreateClick = () => {
    setEditingEntry(null);
    setShowForm(true);
  };

  // Handle edit entry
  const handleEditClick = (entry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  // Handle form save - no need for manual re-fetch, React Query updates automatically
  const handleFormSave = () => {
    setShowForm(false);
    setEditingEntry(null);
    showNotification('success', editingEntry ? 'Información actualizada exitosamente' : 'Información creada exitosamente');
  };

  // Handle form cancel
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  // Open deletion confirmation dialog
  const handleDeleteClick = (entry) => {
    setDeletionDialog({
      open: true,
      entryId: entry._id,
      entryTitle: entry.title
    });
  };

  // Close deletion dialog
  const handleDeleteCancel = () => {
    setDeletionDialog({ open: false, entryId: null, entryTitle: null });
  };

  // Confirm and execute deletion
  const handleDeleteConfirm = async () => {
    const entryId = deletionDialog.entryId;
    
    try {
      setDeletionDialog({ open: false, entryId: null, entryTitle: null });
      
      await deleteHistoricalDataMutation.mutateAsync(entryId);
      
      showNotification('success', 'Información eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting historical data:', error);
      showNotification('error', error.message || 'Error al eliminar información');
    }
  };

  // Handle move up
  const handleMoveUp = async (index) => {
    if (index === 0 || !entries[index - 1]) return;
    
    const newEntries = [...entries];
    [newEntries[index - 1], newEntries[index]] = [newEntries[index], newEntries[index - 1]];
    
    const items = newEntries.map((entry, idx) => ({
      id: entry._id,
      order: idx
    }));
    
    try {
      await reorderHistoricalDataMutation.mutateAsync({ monumentId, items });
      showNotification('success', 'Orden actualizado');
    } catch (error) {
      console.error('Error reordering:', error);
      showNotification('error', 'Error al reordenar');
    }
  };

  // Handle move down
  const handleMoveDown = async (index) => {
    if (index === entries.length - 1 || !entries[index + 1]) return;
    
    const newEntries = [...entries];
    [newEntries[index], newEntries[index + 1]] = [newEntries[index + 1], newEntries[index]];
    
    const items = newEntries.map((entry, idx) => ({
      id: entry._id,
      order: idx
    }));
    
    try {
      await reorderHistoricalDataMutation.mutateAsync({ monumentId, items });
      showNotification('success', 'Orden actualizado');
    } catch (error) {
      console.error('Error reordering:', error);
      showNotification('error', 'Error al reordenar');
    }
  };

  if (showForm) {
    return (
      <HistoricalDataForm
        monumentId={monumentId}
        monumentName={monumentName}
        entry={editingEntry}
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
          Agregar Nueva Información
        </Button>
      </div>

      {/* Entries List */}
      <Card>
        <CardHeader>
          <CardTitle>Información Histórica ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay información histórica para este monumento</p>
              <p className="text-sm mt-1">Haz clic en "Agregar Nueva Información" para crear la primera entrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, index) => (
                <div 
                  key={entry._id} 
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Image */}
                  {entry.imageUrl && (
                    <ImageWithFallback
                      src={entry.imageUrl}
                      alt={entry.title}
                      className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{entry.title}</h3>
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                    {entry.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {entry.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Creado: {new Date(entry.createdAt).toLocaleDateString('es-ES')}
                      {entry.createdBy?.name && ` por ${entry.createdBy.name}`}
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(entry)}
                        disabled={deleteHistoricalDataMutation.isPending || reorderHistoricalDataMutation.isPending}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(entry)}
                        disabled={deleteHistoricalDataMutation.isPending}
                      >
                        {deleteHistoricalDataMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0 || reorderHistoricalDataMutation.isPending}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === entries.length - 1 || reorderHistoricalDataMutation.isPending}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
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
            <AlertDialogTitle>¿Eliminar esta información?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar permanentemente <strong>{deletionDialog.entryTitle}</strong>.
              {' '}<strong className="text-destructive">Esta acción no se puede deshacer.</strong>
              {' '}La imagen asociada también será eliminada del almacenamiento.
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

HistoricalDataEditor.propTypes = {
  monumentId: PropTypes.string.isRequired,
  monumentName: PropTypes.string.isRequired,
};

export default HistoricalDataEditor;

/**
 * Componente ARExperiencesManager
 * 
 * Gestiona experiencias AR con dos vistas:
 * 1. Monument List View: Lista de monumentos organizados por disponibilidad de modelos
 * 2. Model Version Manager View: Gestión de versiones de modelos 3D para un monumento específico
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
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
  Upload, 
  RotateCcw, 
  Trash2, 
  Eye, 
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Box
} from 'lucide-react';
import PropTypes from 'prop-types';
import ModelUpload from './ModelUpload';
import { ImageWithFallback } from './figma/ImageWithFallback';
import apiService from '../services/api';

function ARExperiencesManager() {
  const { monumentId } = useParams();
  const navigate = useNavigate();
  
  // View state management - determined by URL params
  const [view, setView] = useState(monumentId ? 'manage' : 'list');
  const [selectedMonument, setSelectedMonument] = useState(null);
  
  // Monument list state
  const [monumentsWithModels, setMonumentsWithModels] = useState([]);
  const [monumentsWithoutModels, setMonumentsWithoutModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [withoutModelsPage, setWithoutModelsPage] = useState(1);
  const [withModelsPage, setWithModelsPage] = useState(1);
  const [withoutModelsTotal, setWithoutModelsTotal] = useState(0);
  const [withModelsTotal, setWithModelsTotal] = useState(0);
  const pageSize = 9;
  
  // Model version management state
  const [versions, setVersions] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [notification, setNotification] = useState(null);
  
  // Activation confirmation dialog state
  const [activationDialog, setActivationDialog] = useState({
    open: false,
    versionId: null,
    versionName: null
  });

  // Deletion confirmation dialog state
  const [deletionDialog, setDeletionDialog] = useState({
    open: false,
    versionId: null,
    versionName: null
  });

  // 3D Model viewer dialog state
  const [modelViewerDialog, setModelViewerDialog] = useState({
    open: false,
    modelUrl: null,
    monumentName: null
  });

  // Model loading state
  const [modelLoading, setModelLoading] = useState(true);
  
  // Ref for model-viewer element
  const modelViewerRef = useRef(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setWithoutModelsPage(1);
      setWithModelsPage(1);
      setDebouncedSearchTerm(searchTerm);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    if (!monumentId) {
      loadMonuments();
    }
  }, [withoutModelsPage, withModelsPage, debouncedSearchTerm]);

  // Load monument and versions when monumentId changes
  useEffect(() => {
    if (monumentId) {
      // Load the specific monument
      const loadMonumentData = async () => {
        try {
          setLoading(true);
          const monument = await apiService.getMonument(monumentId);
          
          if (monument) {
            setSelectedMonument(monument);
            setView('manage');
            await loadVersions(monumentId);
          } else {
            showNotification('error', 'Monumento no encontrado');
            navigate('/ar-experiences');
          }
        } catch (error) {
          console.error('Error loading monument:', error);
          showNotification('error', 'Error al cargar monumento');
          navigate('/ar-experiences');
        } finally {
          setLoading(false);
        }
      };
      
      loadMonumentData();
    } else {
      setView('list');
      setSelectedMonument(null);
      setVersions([]);
      setShowUpload(false);
    }
  }, [monumentId]);

  // Add event listener for model-viewer load event
  useEffect(() => {
    if (!modelViewerDialog.open) return;
    
    // Always hide loading after 2 seconds as fallback
    const fallbackTimeout = setTimeout(() => {
      setModelLoading(false);
    }, 2000);
    
    const modelViewer = modelViewerRef.current;
    
    if (modelViewer) {
      const handleLoad = () => {
        setModelLoading(false);
      };
      
      const handleProgress = (event) => {
        if (event.detail && event.detail.totalProgress === 1) {
          setModelLoading(false);
        }
      };
      
      modelViewer.addEventListener('load', handleLoad);
      modelViewer.addEventListener('progress', handleProgress);
      
      return () => {
        modelViewer.removeEventListener('load', handleLoad);
        modelViewer.removeEventListener('progress', handleProgress);
        clearTimeout(fallbackTimeout);
      };
    } else {
      return () => clearTimeout(fallbackTimeout);
    }
  }, [modelViewerDialog.open, modelViewerDialog.modelUrl]);

  // Load monuments and organize by model availability
  const loadMonuments = async () => {
    try {
      setLoading(true);
      const [withoutResponse, withResponse] = await Promise.all([
        apiService.getMonuments({
          page: withoutModelsPage,
          limit: pageSize,
          hasModel: false,
          text: debouncedSearchTerm.trim() || undefined
        }),
        apiService.getMonuments({
          page: withModelsPage,
          limit: pageSize,
          hasModel: true,
          text: debouncedSearchTerm.trim() || undefined
        })
      ]);

      const withoutItems = (withoutResponse.items || withoutResponse || []).filter(m => m.imageUrl);
      const withItems = (withResponse.items || withResponse || []).filter(m => m.imageUrl);

      setMonumentsWithoutModels(withoutItems);
      setMonumentsWithModels(withItems);
      setWithoutModelsTotal(withoutResponse.total || 0);
      setWithModelsTotal(withResponse.total || 0);
    } catch (error) {
      console.error('Error loading monuments:', error);
      showNotification('error', 'Error al cargar monumentos');
    } finally {
      setLoading(false);
    }
  };

  const withoutModelsTotalPages = Math.max(1, Math.ceil(withoutModelsTotal / pageSize));
  const withModelsTotalPages = Math.max(1, Math.ceil(withModelsTotal / pageSize));

  // Handle monument selection to navigate to Model Version Manager
  const handleMonumentClick = (monument) => {
    navigate(`/ar-experiences/manage/${monument._id}`);
  };

  // Navigate back to monument list
  const handleBackToList = () => {
    navigate('/ar-experiences');
  };

  // Load model versions for selected monument
  const loadVersions = async (monumentId) => {
    try {
      setLoading(true);
      const response = await apiService.getModelVersions(monumentId);
      const versionsList = response.versions || response.items || response || [];
      setVersions(Array.isArray(versionsList) ? versionsList : []);
    } catch (error) {
      console.error('Error loading versions:', error);
      showNotification('error', 'Error al cargar versiones');
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Open activation confirmation dialog
  const handleActivateClick = (version) => {
    setActivationDialog({
      open: true,
      versionId: version._id,
      versionName: version.filename.split('/').pop()
    });
  };

  // Close activation dialog
  const handleActivateCancel = () => {
    setActivationDialog({ open: false, versionId: null, versionName: null });
  };

  // Confirm and execute activation
  const handleActivateConfirm = async () => {
    const versionId = activationDialog.versionId;
    
    try {
      setActionLoading(versionId);
      setActivationDialog({ open: false, versionId: null, versionName: null });
      
      // Optimistic UI update: immediately update the UI before API call
      setVersions(prevVersions => 
        prevVersions.map(v => ({
          ...v,
          isActive: v._id === versionId
        }))
      );
      
      // Make API call to activate version
      await apiService.activateModelVersion(selectedMonument._id, versionId);
      
      // Reload versions to ensure consistency with backend
      await loadVersions(selectedMonument._id);
      
      showNotification('success', 'Versión activada exitosamente');
    } catch (error) {
      console.error('Error activating version:', error);
      
      // Revert optimistic update on error by reloading versions
      await loadVersions(selectedMonument._id);
      
      showNotification('error', error.message || 'Error al activar versión');
    } finally {
      setActionLoading(null);
    }
  };

  // Open deletion confirmation dialog
  const handleDeleteClick = (version) => {
    setDeletionDialog({
      open: true,
      versionId: version._id,
      versionName: version.filename.split('/').pop()
    });
  };

  // Close deletion dialog
  const handleDeleteCancel = () => {
    setDeletionDialog({ open: false, versionId: null, versionName: null });
  };

  // Open 3D model viewer
  const handleViewModel = (modelUrl) => {
    setModelLoading(true); // Reset loading state when opening
    setModelViewerDialog({
      open: true,
      modelUrl: modelUrl,
      monumentName: selectedMonument?.name || 'Modelo 3D'
    });
  };

  // Close 3D model viewer
  const handleCloseModelViewer = () => {
    setModelViewerDialog({ open: false, modelUrl: null, monumentName: null });
    setModelLoading(true); // Reset loading state when closing
  };

  // Confirm and execute deletion
  const handleDeleteConfirm = async () => {
    const versionId = deletionDialog.versionId;
    
    try {
      setActionLoading(versionId);
      setDeletionDialog({ open: false, versionId: null, versionName: null });
      
      // Optimistic UI update: immediately remove the version from UI
      setVersions(prevVersions => prevVersions.filter(v => v._id !== versionId));
      
      // Make API call to delete version
      await apiService.deleteModelVersion(selectedMonument._id, versionId);
      
      // Reload versions to ensure consistency with backend
      await loadVersions(selectedMonument._id);
      
      showNotification('success', 'Versión eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting version:', error);
      
      // Revert optimistic update on error by reloading versions
      await loadVersions(selectedMonument._id);
      
      showNotification('error', error.message || 'Error al eliminar versión');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUploadComplete = async () => {
    setShowUpload(false);
    await loadVersions(selectedMonument._id);
    showNotification('success', 'Nuevo modelo subido exitosamente');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render Monument List View
  if (view === 'list') {
    const filteredWithModels = monumentsWithModels;
    const filteredWithoutModels = monumentsWithoutModels;

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Experiencias AR</h1>
          <p className="text-muted-foreground">
            Gestiona los modelos 3D de los monumentos para experiencias de realidad aumentada
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar monumentos por nombre, distrito o cultura..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

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

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Monuments without 3D Models - Priority Display */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Monumentos sin Modelos 3D
                </h2>
              </div>
              
              {filteredWithoutModels.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    {searchTerm ? 'No se encontraron monumentos sin modelos' : 'Todos los monumentos tienen modelos 3D'}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {filteredWithoutModels.map((monument) => (
                      <MonumentCard
                        key={monument._id}
                        monument={monument}
                        hasModel={false}
                        onClick={() => handleMonumentClick(monument)}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                      Página {withoutModelsPage} de {withoutModelsTotalPages} • {withoutModelsTotal} sin modelo
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWithoutModelsPage(prev => Math.max(1, prev - 1))}
                        disabled={loading || withoutModelsPage <= 1}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWithoutModelsPage(prev => Math.min(withoutModelsTotalPages, prev + 1))}
                        disabled={loading || withoutModelsPage >= withoutModelsTotalPages}
                      >
                        Siguiente
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Monuments with 3D Models */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Monumentos con Modelos 3D
                </h2>
              </div>
              
              {filteredWithModels.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    {searchTerm ? 'No se encontraron monumentos con modelos' : 'No hay monumentos con modelos 3D'}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {filteredWithModels.map((monument) => (
                      <MonumentCard
                        key={monument._id}
                        monument={monument}
                        hasModel={true}
                        onClick={() => handleMonumentClick(monument)}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                      Página {withModelsPage} de {withModelsTotalPages} • {withModelsTotal} con modelo
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWithModelsPage(prev => Math.max(1, prev - 1))}
                        disabled={loading || withModelsPage <= 1}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWithModelsPage(prev => Math.min(withModelsTotalPages, prev + 1))}
                        disabled={loading || withModelsPage >= withModelsTotalPages}
                      >
                        Siguiente
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // Render Model Version Manager View
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back Navigation */}
      <Button variant="ghost" onClick={handleBackToList} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Volver a Monumentos
      </Button>

      {/* Monument Information */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <ImageWithFallback
              src={selectedMonument?.imageUrl || '/placeholder-monument.jpg'}
              alt={selectedMonument?.name}
              className="w-32 h-32 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{selectedMonument?.name}</h2>
              <div className="flex gap-2 mt-2">
                {selectedMonument?.location?.district && (
                  <Badge variant="outline">{selectedMonument.location.district}</Badge>
                )}
                {selectedMonument?.culture && (
                  <Badge variant="outline">{selectedMonument.culture}</Badge>
                )}
              </div>
              {selectedMonument?.description && (
                <p className="text-muted-foreground mt-3 line-clamp-2">
                  {selectedMonument.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Add Model Button */}
      <div>
        <Button 
          onClick={() => setShowUpload(!showUpload)}
          variant={showUpload ? "outline" : "default"}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          {showUpload ? 'Cancelar' : 'Agregar Nuevo Modelo'}
        </Button>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Subir Nuevo Modelo 3D</CardTitle>
          </CardHeader>
          <CardContent>
            <ModelUpload
              onUploadComplete={handleUploadComplete}
              monumentId={selectedMonument._id}
              monumentName={selectedMonument.name}
            />
          </CardContent>
        </Card>
      )}

      {/* Model Versions */}
      <Card>
        <CardHeader>
          <CardTitle>Versiones del Modelo ({versions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Box className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay modelos 3D para este monumento</p>
              <p className="text-sm mt-1">Haz clic en "Agregar Nuevo Modelo" para subir el primer modelo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div 
                  key={version._id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{version.filename.split('/').pop()}</p>
                      {version.isActive ? (
                        <Badge variant="default">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Suspendido</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(version.fileSize)} • 
                      {' '}{formatDate(version.uploadedAt)} • 
                      {' '}{version.uploadedBy?.name || 'Usuario'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!version.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivateClick(version)}
                        disabled={actionLoading === version._id}
                      >
                        {actionLoading === version._id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4 mr-2" />
                        )}
                        Activar
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(version)}
                      disabled={actionLoading === version._id}
                    >
                      {actionLoading === version._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                    {version.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewModel(version.url)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Modelo
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activation Confirmation Dialog */}
      <AlertDialog open={activationDialog.open} onOpenChange={(open) => !open && handleActivateCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Activar esta versión del modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de activar <strong>{activationDialog.versionName}</strong> como la versión activa del modelo 3D.
              {' '}La versión actualmente activa será suspendida automáticamente.
              {' '}Esta acción actualizará el modelo que se muestra en la aplicación móvil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleActivateCancel}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleActivateConfirm}>
              Activar Versión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deletion Confirmation Dialog */}
      <AlertDialog open={deletionDialog.open} onOpenChange={(open) => !open && handleDeleteCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta versión del modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar permanentemente <strong>{deletionDialog.versionName}</strong>.
              {' '}<strong className="text-destructive">Esta acción no se puede deshacer.</strong>
              {' '}El archivo será eliminado del almacenamiento en la nube y no podrá ser recuperado.
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

      {/* 3D Model Viewer Dialog */}
      <Dialog open={modelViewerDialog.open} onOpenChange={handleCloseModelViewer}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Vista Previa del Modelo 3D - {modelViewerDialog.monumentName}</DialogTitle>
            <DialogDescription>
              Visualiza el modelo 3D en tiempo real. Puedes rotar, hacer zoom y explorar el modelo.
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-[70vh] bg-gray-100 rounded-lg overflow-hidden relative">
            {modelViewerDialog.modelUrl ? (
              <>
                <model-viewer
                  ref={modelViewerRef}
                  src={modelViewerDialog.modelUrl}
                  alt="Modelo 3D"
                  auto-rotate
                  camera-controls
                  shadow-intensity="1"
                  style={{ width: '100%', height: '100%' }}
                  loading="eager"
                />
                {modelLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                    <div className="flex items-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="ml-2">Cargando modelo 3D...</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground flex items-center justify-center h-full">
                <div>
                  <Box className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No se pudo cargar el modelo 3D</p>
                  <p className="text-sm mt-2">URL: {modelViewerDialog.modelUrl || 'No disponible'}</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCloseModelViewer}>
              Cerrar
            </Button>
            <Button onClick={() => window.open(modelViewerDialog.modelUrl, '_blank')}>
              Descargar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Monument Card Component
function MonumentCard({ monument, hasModel, onClick }) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <ImageWithFallback
            src={monument.imageUrl || '/placeholder-monument.jpg'}
            alt={monument.name}
            className="w-full h-40 rounded-lg object-cover"
          />
          <div>
            <h3 className="font-semibold line-clamp-1">{monument.name}</h3>
            {monument.location?.district && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {monument.location.district}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between">
            {hasModel ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <Box className="w-3 h-3 mr-1" />
                Con Modelo
              </Badge>
            ) : (
              <Badge variant="secondary">
                Sin Modelo
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

MonumentCard.propTypes = {
  monument: PropTypes.object.isRequired,
  hasModel: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default ARExperiencesManager;

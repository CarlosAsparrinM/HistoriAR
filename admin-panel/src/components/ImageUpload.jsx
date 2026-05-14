/**
 * Componente ImageUpload
 * 
 * Maneja la subida de archivos de imágenes para monumentos con soporte de arrastrar y soltar,
 * validación de archivos, seguimiento de progreso y manejo de errores para integración con S3.
 */
import { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2 
} from 'lucide-react';
import PropTypes from 'prop-types';
import Api from '../services/api';

const ACCEPTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

function ImageUpload({ 
  onUploadComplete, 
  onUploadError, 
  currentImageUrl = null,
  disabled = false,
  monumentId = null, // Optional: if provided, uses structured path
  entityType = 'monuments' // 'monuments' or 'institutions'
}) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Validar formato y tamaño del archivo
  const validateFile = useCallback((file) => {
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!ACCEPTED_FORMATS.includes(fileExtension)) {
      return {
        valid: false,
        error: `Formato no válido. Solo se aceptan archivos ${ACCEPTED_FORMATS.join(', ')}`
      };
    }
    
    if (file.size > MAX_FILE_SIZE) {
      const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
      return {
        valid: false,
        error: `El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB`
      };
    }
    
    return { valid: true };
  }, []);

  // Manejar selección de archivo
  const handleFileSelect = useCallback((file) => {
    const validation = validateFile(file);
    
    if (!validation.valid) {
      setErrorMessage(validation.error);
      setUploadStatus('error');
      return;
    }
    
    setSelectedFile(file);
    setUploadStatus('idle');
    setErrorMessage('');
    setUploadProgress(0);
    
    // Crear URL de vista previa
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, [validateFile]);

  // Manejar eventos de arrastrar
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Manejar evento de soltar
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [disabled, handleFileSelect]);

  // Manejar cambio en input de archivo
  const handleInputChange = useCallback((e) => {
    if (disabled) return;
    
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [disabled, handleFileSelect]);

  // Subir archivo a S3
  const uploadFile = useCallback(async () => {
    if (!selectedFile) return;
    
    setUploadStatus('uploading');
    setUploadProgress(0);
    
    try {
      const entityId = monumentId || entityType;
      const safeName = selectedFile.name.replace(/\s+/g, '_');
      const keyPrefix = entityType === 'institutions'
        ? `images/institutions/${entityId}`
        : `images/monuments/${entityId}`;
      const key = `${keyPrefix}/${Date.now()}_${safeName}`;

      const { url: presignedUrl, publicUrl } = await Api.getPresignedUploadUrl({
        key,
        contentType: selectedFile.type || 'application/octet-stream',
        expiresIn: 900,
      });

      // Simular progreso de subida mientras hacemos PUT directo a S3
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      await Api.uploadFileToPresignedUrl(presignedUrl, selectedFile);

      clearInterval(progressInterval);

      setUploadProgress(100);
      setUploadStatus('success');

      if (onUploadComplete) {
        onUploadComplete({
          key,
          publicUrl,
          fileName: selectedFile.name,
          previewUrl,
          entityType,
          entityId,
        });
      }

      setTimeout(() => {
        clearSelection();
      }, 2000);

    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error.message || 'Error al subir el archivo');
      
      if (onUploadError) {
        onUploadError(error);
      }
    }
  }, [selectedFile, onUploadComplete, onUploadError, previewUrl, entityType, monumentId]);

  // Limpiar selección
  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  // Formatear tamaño de archivo para mostrar
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Current image display - Solo se muestra cuando hay imagen y no hay archivo seleccionado */}
      {currentImageUrl && !selectedFile && (
        <Card className="w-full">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img 
                  src={currentImageUrl} 
                  alt="Imagen actual" 
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Imagen actual</p>
                  <p className="text-sm text-muted-foreground break-words">
                    {currentImageUrl.split('/').pop()}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="flex-shrink-0 mt-1"
              >
                Reemplazar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload area - Solo se muestra cuando NO hay imagen actual O cuando se selecciona un archivo */}
      {(!currentImageUrl || selectedFile) && (
        <Card 
          className={`w-full ${
            dragActive ? 'border-primary bg-primary/5' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <CardContent className="p-6">
            {!selectedFile ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">Subir imagen</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Arrastra y suelta tu imagen aquí, o{' '}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={disabled}
                    >
                      selecciona un archivo
                    </button>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Formatos: {ACCEPTED_FORMATS.join(', ')} • Máximo: 10MB
                  </p>
                </div>
              </div>
            ) : (
            <div className="space-y-4">
              {/* Selected file info with preview */}
              <div className="flex items-start justify-between p-3 bg-muted rounded-lg gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt="Vista previa" 
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-8 h-8 text-blue-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                {uploadStatus === 'idle' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    disabled={disabled}
                    className="flex-shrink-0 mt-1"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Upload progress */}
              {uploadStatus === 'uploading' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Subiendo...</span>
                    <span className="text-sm text-muted-foreground">
                      {uploadProgress}%
                    </span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Success state */}
              {uploadStatus === 'success' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Imagen subida exitosamente
                  </AlertDescription>
                </Alert>
              )}

              {/* Upload button */}
              {uploadStatus === 'idle' && (
                <Button 
                  onClick={uploadFile} 
                  className="w-full"
                  disabled={disabled}
                >
                  Subir imagen
                </Button>
              )}

              {/* Uploading state button */}
              {uploadStatus === 'uploading' && (
                <Button disabled className="w-full">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Subiendo...
                </Button>
              )}
            </div>
          )}
          </CardContent>
        </Card>
      )}

      {/* Error message */}
      {uploadStatus === 'error' && errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FORMATS.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}

ImageUpload.propTypes = {
  onUploadComplete: PropTypes.func,
  onUploadError: PropTypes.func,
  currentImageUrl: PropTypes.string,
  disabled: PropTypes.bool,
  monumentId: PropTypes.string, // Optional: for structured path
  entityType: PropTypes.oneOf(['monuments', 'institutions']), // Type of entity
};

export default ImageUpload;
/**
 * Componente ModelUpload
 * 
 * Maneja la subida de archivos de modelos 3D en formatos GLB/GLTF con soporte de arrastrar y soltar,
 * validación de archivos, seguimiento de progreso y manejo de errores para integración con GCS.
 */
import { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2 
} from 'lucide-react';
import PropTypes from 'prop-types';
import apiService from '../services/api';

const ACCEPTED_FORMATS = ['.glb', '.gltf'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes

function ModelUpload({ 
  onUploadComplete, 
  onUploadError, 
  monumentId,
  monumentName,
  currentModelUrl = null,
  disabled = false 
}) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [errorMessage, setErrorMessage] = useState('');
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

  // Limpiar selección
  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Subir archivo con progreso simulado
  const uploadFile = useCallback(async () => {
    if (!selectedFile || !monumentId) return;
    
    setUploadStatus('uploading');
    setUploadProgress(0);
    
    try {
      const safeName = selectedFile.name.replace(/\s+/g, '_');
      const key = `models/monuments/${monumentId}/${Date.now()}_${safeName}`;
      const { url: presignedUrl, publicUrl } = await apiService.getPresignedUploadUrl({
        key,
        contentType: selectedFile.type || 'application/octet-stream',
        expiresIn: 900,
      });

      // Simular progreso de subida
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await apiService.uploadFileToPresignedUrl(presignedUrl, selectedFile);

      const result = await apiService.confirmModelVersionUpload(monumentId, {
        key,
        filename: selectedFile.name,
        fileSize: selectedFile.size,
        contentType: selectedFile.type || 'application/octet-stream',
      });
      
      clearInterval(progressInterval);
      
      setUploadProgress(100);
      setUploadStatus('success');
      
      // Llamar callback de éxito con los datos del resultado
      if (onUploadComplete) {
        onUploadComplete({ ...result, publicUrl });
      }
      
      // Limpiar después de un breve delay
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
  }, [selectedFile, monumentId, onUploadComplete, onUploadError, clearSelection]);

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
      {/* Mostrar modelo actual */}
      {currentModelUrl && !selectedFile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <File className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Modelo 3D actual</p>
                  <p className="text-sm text-muted-foreground">
                    {currentModelUrl.split('/').pop()}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                Reemplazar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Área de subida */}
      <Card 
        className={`transition-colors ${
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
                <h3 className="font-medium">Subir modelo 3D</h3>
                {monumentName && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Para: <span className="font-medium">{monumentName}</span>
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Arrastra y suelta tu archivo aquí, o{' '}
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
                  Formatos: {ACCEPTED_FORMATS.join(', ')} • Máximo: 100MB
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Información del archivo seleccionado */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <File className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
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
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Progreso de subida */}
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

              {/* Estado de éxito */}
              {uploadStatus === 'success' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Modelo 3D subido exitosamente
                  </AlertDescription>
                </Alert>
              )}

              {/* Botón de subida */}
              {uploadStatus === 'idle' && (
                <Button 
                  onClick={uploadFile} 
                  className="w-full"
                  disabled={disabled}
                >
                  Subir modelo 3D
                </Button>
              )}

              {/* Botón en estado de subida */}
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

      {/* Mensaje de error */}
      {uploadStatus === 'error' && errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Input de archivo oculto */}
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

ModelUpload.propTypes = {
  onUploadComplete: PropTypes.func,
  onUploadError: PropTypes.func,
  monumentId: PropTypes.string.isRequired,
  monumentName: PropTypes.string,
  currentModelUrl: PropTypes.string,
  disabled: PropTypes.bool,
};

export default ModelUpload;
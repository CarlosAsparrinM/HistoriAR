/**
 * Componente HistoricalDataForm
 * 
 * Formulario para crear o editar entradas de información histórica
 * Incluye upload de imagen con preview
 * Usa React Query mutations para guardar datos
 */
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import {
  Upload,
  X,
  Loader2,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useCreateHistoricalData, useUpdateHistoricalData } from '../hooks/useHistoricalData';

function HistoricalDataForm({ monumentId, monumentName, entry = null, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: entry?.title || '',
    description: entry?.description || '',
  });
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(entry?.imageUrl || null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef(null);

  // React Query mutations
  const createMutation = useCreateHistoricalData();
  const updateMutation = useUpdateHistoricalData();
  
  // Check if either mutation is pending
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isEditing = Boolean(entry);

  // Handle input change
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  // Handle file selection
  const handleFileSelect = (file) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5MB');
      return;
    }

    setError(null);
    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Clear selected image
  const handleClearImage = () => {
    setSelectedImage(null);
    setImagePreview(entry?.imageUrl || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title.trim()) {
      setError('El título es obligatorio');
      return;
    }

    if (!isEditing && !selectedImage) {
      setError('La imagen es obligatoria');
      return;
    }

    setError(null);

    try {
      if (isEditing) {
        // Update existing entry using mutation
        await updateMutation.mutateAsync({
          entryId: entry._id,
          formData,
          imageFile: selectedImage,
        });
      } else {
        // Create new entry using mutation
        await createMutation.mutateAsync({
          monumentId,
          formData,
          imageFile: selectedImage,
        });
      }
      
      // Call onSave callback after successful mutation
      onSave();
    } catch (err) {
      console.error('Error saving historical data:', err);
      setError(err.message || 'Error al guardar la información');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Editar Información Histórica' : 'Agregar Nueva Información'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Para: <strong>{monumentName}</strong>
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Title */}
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ej: Descubrimiento, Cultura Inca, Arquitectura..."
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
              placeholder="Describe la información histórica o cultural..."
              rows={5}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Image Upload */}
          <div>
            <Label>Imagen {!isEditing && '*'}</Label>
            
            {imagePreview ? (
              <div className="mt-2 space-y-3">
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-w-md h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleClearImage}
                    disabled={isSubmitting}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {selectedImage && (
                  <p className="text-sm text-muted-foreground">
                    Nueva imagen: {selectedImage.name} ({(selectedImage.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
            ) : (
              <div
                className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Arrastra una imagen aquí, o{' '}
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                      >
                        selecciona un archivo
                      </button>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Formatos: JPG, PNG • Máximo: 5MB
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
              disabled={isSubmitting}
            />
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
                  {isEditing ? 'Actualizando...' : 'Guardando...'}
                </>
              ) : (
                isEditing ? 'Actualizar Información' : 'Guardar Información'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

HistoricalDataForm.propTypes = {
  monumentId: PropTypes.string.isRequired,
  monumentName: PropTypes.string.isRequired,
  entry: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default HistoricalDataForm;

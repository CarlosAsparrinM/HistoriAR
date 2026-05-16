/**
 * Componente TourForm
 * 
 * Formulario para crear y editar tours con selección de monumentos
 * y reordenamiento mediante drag & drop.
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Save, 
  X, 
  Loader2,
  AlertCircle,
  GripVertical,
  Plus,
  Trash2
} from 'lucide-react';
import PropTypes from 'prop-types';
import apiService from '../services/api';
import { useCreateTour, useUpdateTour } from '../hooks/useTours';

const TOUR_TYPES = [
  'Recomendado',
  'Cronológico',
  'Temático',
  'Arquitectónico',
  'Familiar',
  'Experto',
  'Rápido',
  'Completo'
];

function TourForm({ 
  tour, 
  institutions, 
  monuments, 
  onClose, 
  onSave, 
  preselectedInstitutionId = null,
  allowedTourTypes = TOUR_TYPES 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    institutionId: preselectedInstitutionId || '',
    type: allowedTourTypes[0] || 'Recomendado',
    estimatedDuration: 60,
    isActive: true,
    monuments: []
  });
  const [availableMonuments, setAvailableMonuments] = useState([]);
  const [selectedMonumentId, setSelectedMonumentId] = useState('');
  const [error, setError] = useState('');

  // React Query mutations
  const createMutation = useCreateTour();
  const updateMutation = useUpdateTour();
  
  const loading = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (tour) {
      setFormData({
        name: tour.name || '',
        description: tour.description || '',
        institutionId: tour.institutionId?._id || tour.institutionId || preselectedInstitutionId || '',
        type: tour.type || allowedTourTypes[0] || 'Recomendado',
        estimatedDuration: tour.estimatedDuration || 60,
        isActive: tour.isActive !== undefined ? tour.isActive : true,
        monuments: tour.monuments?.map((m, idx) => ({
          monumentId: m.monumentId?._id || m.monumentId,
          order: m.order !== undefined ? m.order : idx,
          description: m.description || ''
        })) || []
      });
    } else if (preselectedInstitutionId) {
      // Si hay institución preseleccionada y no hay tour, establecerla
      setFormData(prev => ({
        ...prev,
        institutionId: preselectedInstitutionId
      }));
    }
  }, [tour, preselectedInstitutionId, allowedTourTypes]);

  useEffect(() => {
    if (formData.institutionId) {
      const filtered = monuments.filter(m => 
        m.institutionId === formData.institutionId || 
        m.institutionId?._id === formData.institutionId
      );
      setAvailableMonuments(filtered);
    } else {
      setAvailableMonuments([]);
    }
  }, [formData.institutionId, monuments]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleAddMonument = () => {
    if (!selectedMonumentId) return;
    
    // Verificar que no esté ya agregado
    if (formData.monuments.some(m => m.monumentId === selectedMonumentId)) {
      setError('Este monumento ya está en el tour');
      return;
    }
    
    const newMonument = {
      monumentId: selectedMonumentId,
      order: formData.monuments.length,
      description: ''
    };
    
    setFormData(prev => ({
      ...prev,
      monuments: [...prev.monuments, newMonument]
    }));
    setSelectedMonumentId('');
  };

  const handleRemoveMonument = (index) => {
    setFormData(prev => ({
      ...prev,
      monuments: prev.monuments.filter((_, i) => i !== index).map((m, idx) => ({
        ...m,
        order: idx
      }))
    }));
  };

  const handleMonumentDescriptionChange = (index, description) => {
    setFormData(prev => ({
      ...prev,
      monuments: prev.monuments.map((m, i) => 
        i === index ? { ...m, description } : m
      )
    }));
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    
    setFormData(prev => {
      const newMonuments = [...prev.monuments];
      [newMonuments[index - 1], newMonuments[index]] = [newMonuments[index], newMonuments[index - 1]];
      return {
        ...prev,
        monuments: newMonuments.map((m, idx) => ({ ...m, order: idx }))
      };
    });
  };

  const handleMoveDown = (index) => {
    if (index === formData.monuments.length - 1) return;
    
    setFormData(prev => {
      const newMonuments = [...prev.monuments];
      [newMonuments[index], newMonuments[index + 1]] = [newMonuments[index + 1], newMonuments[index]];
      return {
        ...prev,
        monuments: newMonuments.map((m, idx) => ({ ...m, order: idx }))
      };
    });
  };

  const validate = () => {
    if (!formData.name.trim()) {
      setError('El nombre es requerido');
      return false;
    }
    if (!formData.institutionId) {
      setError('Debe seleccionar una institución');
      return false;
    }
    if (formData.monuments.length === 0) {
      setError('Debe agregar al menos un monumento');
      return false;
    }
    if (!formData.estimatedDuration || formData.estimatedDuration <= 0) {
      setError('La duración debe ser mayor a 0');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      setError('');
      
      if (tour) {
        await updateMutation.mutateAsync({
          tourId: tour._id,
          data: formData
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      
      onSave();
    } catch (err) {
      console.error('Error saving tour:', err);
      setError(err.message || 'Error al guardar el tour');
    }
  };

  const getMonumentName = (monumentId) => {
    const monument = monuments.find(m => m._id === monumentId);
    return monument?.name || 'Monumento desconocido';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {tour ? 'Editar Recorrido' : 'Nuevo Recorrido'}
        </h1>
        <Button variant="outline" onClick={onClose}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del Tour *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ej: Tour Histórico"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe el recorrido..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="institution">Institución *</Label>
                <select
                  id="institution"
                  value={formData.institutionId}
                  onChange={(e) => handleChange('institutionId', e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                  disabled={!!preselectedInstitutionId}
                >
                  <option value="">Seleccionar institución</option>
                  {institutions.map(inst => (
                    <option key={inst._id} value={inst._id}>{inst.name}</option>
                  ))}
                </select>
                {preselectedInstitutionId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    La institución está preseleccionada y no se puede cambiar
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="type">Tipo de Tour *</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  {allowedTourTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duración Estimada (minutos) *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.estimatedDuration || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseInt(e.target.value);
                    handleChange('estimatedDuration', val);
                  }}
                  min="1"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-8">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="isActive">Tour activo</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monuments */}
        <Card>
          <CardHeader>
            <CardTitle>Monumentos del Recorrido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Monument */}
            <div className="flex gap-2">
              <select
                value={selectedMonumentId}
                onChange={(e) => setSelectedMonumentId(e.target.value)}
                className="flex-1 p-2 border rounded-md"
                disabled={!formData.institutionId}
              >
                <option value="">
                  {formData.institutionId 
                    ? 'Seleccionar monumento' 
                    : 'Primero selecciona una institución'}
                </option>
                {availableMonuments.map(monument => (
                  <option key={monument._id} value={monument._id}>
                    {monument.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                onClick={handleAddMonument}
                disabled={!selectedMonumentId}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>

            {/* Monuments List */}
            <div className="space-y-2">
              {formData.monuments.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No hay monumentos agregados
                </p>
              ) : (
                formData.monuments.map((monument, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="h-6 px-2"
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === formData.monuments.length - 1}
                          className="h-6 px-2"
                        >
                          ↓
                        </Button>
                      </div>
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">
                          {index + 1}. {getMonumentName(monument.monumentId)}
                        </p>
                        <Input
                          placeholder="Descripción opcional para este punto..."
                          value={monument.description}
                          onChange={(e) => handleMonumentDescriptionChange(index, e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveMonument(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Tour
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

TourForm.propTypes = {
  tour: PropTypes.object,
  institutions: PropTypes.array.isRequired,
  monuments: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  preselectedInstitutionId: PropTypes.string,
  allowedTourTypes: PropTypes.array,
};

export default TourForm;

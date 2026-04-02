/**
 * Gestor de Monumentos (MonumentsManager)
 * 
 * Permite listar, filtrar y administrar monumentos y sitios históricos.
 * Incluye creación (diálogo), cambio de estado, eliminación y estadísticas rápidas.
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  MapPin,
  Box,
  Loader2
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import ImageUpload from './ImageUpload';
import { useToast } from './ui/toast';
import apiService from '../services/api';
import PropTypes from 'prop-types';

// Esta función se actualizará dinámicamente con las categorías de la base de datos

// Etiquetas legibles para los estados
const statusLabels = {
  'Disponible': 'Disponible',
  'Oculto': 'Oculto',
  'Borrado': 'Borrado'
};

// Mapeo de color de badge por estado
const statusColors = {
  'Disponible': 'default',
  'Oculto': 'secondary',
  'Borrado': 'destructive'
};

function MonumentsManager() {
  const { toast } = useToast();
  const [monuments, setMonuments] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMonument, setEditingMonument] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [monumentsData, institutionsData, categoriesData] = await Promise.all([
        apiService.getMonuments(),
        apiService.getInstitutions({ availableOnly: true }), // Solo instituciones disponibles
        apiService.getCategories({ activeOnly: true }) // Solo categorías activas para el formulario
      ]);
      
      setMonuments(monumentsData.items || monumentsData || []);
      setInstitutions(institutionsData.items || institutionsData || []);
      setCategories(categoriesData.items || categoriesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtro compuesto por término de búsqueda, categoría y estado
  const filteredMonuments = monuments
    .filter(monument => {
      const matchesSearch = monument.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           monument.location?.district?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || monument.categoryId === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || monument.status === selectedStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      // Organizar monumentos: con modelos primero, sin modelos después
      const aHasModel = Boolean(a.model3DUrl);
      const bHasModel = Boolean(b.model3DUrl);
      
      if (aHasModel && !bHasModel) return -1;
      if (!aHasModel && bHasModel) return 1;
      
      // Si ambos tienen o no tienen modelo, mantener orden alfabético
      return a.name.localeCompare(b.name);
    });

  // Función para obtener el nombre de la categoría
  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c._id === categoryId);
    return category?.name || 'Sin categoría';
  };

  // Verificar si el monumento está completo (tiene imagen y modelo 3D)
  const isMonumentComplete = (monument) => {
    return monument.imageUrl && monument.model3DUrl;
  };

  // Cambiar estado del monumento
  const handleStatusChange = async (id, newStatus) => {
    try {
      await apiService.updateMonument(id, { status: newStatus });
      setMonuments(prev => 
        prev.map(monument => 
          monument._id === id 
            ? { ...monument, status: newStatus }
            : monument
        )
      );
      toast({
        title: "Estado actualizado",
        description: `El monumento ahora está ${newStatus.toLowerCase()}`,
        variant: "success"
      });
    } catch (error) {
      console.error('Error updating monument status:', error);
      toast({
        title: "Error",
        description: error.message || 'Error al cambiar el estado del monumento',
        variant: "error"
      });
      // Recargar para asegurar consistencia
      loadData();
    }
  };

  // Eliminar monumento
  const handleDelete = async (id) => {
    try {
      await apiService.deleteMonument(id);
      setMonuments(prev => prev.filter(monument => monument._id !== id));
    } catch (error) {
      console.error('Error deleting monument:', error);
    }
  };

  // Abrir diálogo de edición
  const handleEdit = (monument) => {
    setEditingMonument(monument);
    setIsEditDialogOpen(true);
  };

  // Cerrar diálogo de edición
  const handleCloseEdit = () => {
    setEditingMonument(null);
    setIsEditDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Gestión de Monumentos</h1>
          <p className="text-muted-foreground">
            Administra los monumentos y sitios históricos de la aplicación
          </p>
        </div>
        
        {/* Diálogo de creación de monumento */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Monumento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Monumento</DialogTitle>
              <DialogDescription>
                Añade un nuevo monumento o sitio histórico al catálogo
              </DialogDescription>
            </DialogHeader>
            <MonumentForm 
              institutions={institutions}
              categories={categories}
              onClose={() => setIsCreateDialogOpen(false)}
              onSave={loadData}
              toast={toast}
            />
          </DialogContent>
        </Dialog>

        {/* Diálogo de edición de monumento */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Monumento</DialogTitle>
              <DialogDescription>
                Modifica la información del monumento seleccionado
              </DialogDescription>
            </DialogHeader>
            <MonumentForm 
              monument={editingMonument}
              institutions={institutions}
              categories={categories}
              onClose={handleCloseEdit}
              onSave={loadData}
              toast={toast}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar monumentos por nombre o distrito..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="Disponible">Disponible</SelectItem>
                <SelectItem value="Oculto">Oculto</SelectItem>
                <SelectItem value="Borrado">Borrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Total Monumentos</p>
                <p className="text-2xl font-bold">{monuments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Eye className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Disponibles</p>
                <p className="text-2xl font-bold">
                  {monuments.filter(m => m.status === 'Disponible').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Edit className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Ocultos</p>
                <p className="text-2xl font-bold">
                  {monuments.filter(m => m.status === 'Oculto').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Box className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Con Modelo 3D</p>
                <p className="text-2xl font-bold">
                  {monuments.filter(m => m.model3DUrl).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de monumentos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Monumentos</CardTitle>
          <CardDescription>
            {filteredMonuments.length} monumentos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Monumento</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Distrito</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Modelo 3D</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Última modificación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    <p className="mt-2 text-muted-foreground">Cargando monumentos...</p>
                  </TableCell>
                </TableRow>
              ) : filteredMonuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground">No se encontraron monumentos</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMonuments.map((monument) => (
                  <TableRow key={monument._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ImageWithFallback
                          src={monument.imageUrl || '/placeholder-monument.jpg'}
                          alt={monument.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-medium">{monument.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {monument.culture || 'Sin cultura definida'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCategoryName(monument.categoryId)}
                      </Badge>
                    </TableCell>
                    <TableCell>{monument.location?.district || 'Sin distrito'}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[monument.status] || 'secondary'}>
                        {statusLabels[monument.status] || monument.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {monument.model3DUrl ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Disponible
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Sin modelo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {monument.period?.name || 'Sin período'}
                    </TableCell>
                    <TableCell>
                      {new Date(monument.updatedAt || monument.createdAt).toLocaleDateString('es-PE')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(monument)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {monument.status === 'Oculto' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(monument._id, 'Disponible')}
                              disabled={!isMonumentComplete(monument)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Hacer disponible
                              {!isMonumentComplete(monument) && (
                                <span className="ml-2 text-xs">
                                  (requiere {!monument.imageUrl && 'imagen'}{!monument.imageUrl && !monument.model3DUrl && ' y '}{!monument.model3DUrl && 'modelo 3D'})
                                </span>
                              )}
                            </DropdownMenuItem>
                          )}
                          {monument.status === 'Disponible' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(monument._id, 'Oculto')}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ocultar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(monument._id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MonumentForm({ onClose, monument = null, institutions = [], categories = [], onSave, toast }) {
  const [formData, setFormData] = useState({
    name: monument?.name || '',
    categoryId: monument?.categoryId || '',
    description: monument?.description || '',
    culture: monument?.culture || '',
    institutionId: monument?.institutionId || '',
    location: {
      lat: monument?.location?.lat || '',
      lng: monument?.location?.lng || '',
      address: monument?.location?.address || '',
      district: monument?.location?.district || ''
    },
    period: {
      name: monument?.period?.name || '',
      startYear: monument?.period?.startYear || '',
      endYear: monument?.period?.endYear || ''
    },
    imageUrl: monument?.imageUrl || null,
    s3ImageKey: monument?.s3ImageKey || null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validaciones
  const validateForm = () => {
    // Validar nombre
    if (!formData.name.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre del monumento es requerido",
        variant: "warning"
      });
      return false;
    }

    // Validar categoría
    if (!formData.categoryId) {
      toast({
        title: "Error de validación",
        description: "Debes seleccionar una categoría",
        variant: "warning"
      });
      return false;
    }

    // Validar años del período
    if (formData.period.startYear && formData.period.endYear) {
      const startYear = parseInt(formData.period.startYear);
      const endYear = parseInt(formData.period.endYear);
      
      if (endYear < startYear) {
        toast({
          title: "Error de validación",
          description: "El año de fin no puede ser menor al año de inicio",
          variant: "warning"
        });
        return false;
      }
    }

    // Validar coordenadas (si se proporciona una, se debe proporcionar la otra)
    if ((formData.location.lat && !formData.location.lng) || (!formData.location.lat && formData.location.lng)) {
      toast({
        title: "Error de validación",
        description: "Debes proporcionar tanto latitud como longitud, o ninguna",
        variant: "warning"
      });
      return false;
    }

    return true;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Manejar cambio de institución y auto-completar distrito y dirección
  const handleInstitutionChange = (institutionId) => {
    const selectedInstitution = institutions.find(inst => inst._id === institutionId);
    
    if (selectedInstitution) {
      setFormData(prev => ({
        ...prev,
        institutionId: institutionId,
        location: {
          ...prev.location,
          district: selectedInstitution.location?.district || prev.location.district,
          address: selectedInstitution.location?.address || prev.location.address
        }
      }));
    } else {
      handleInputChange('institutionId', institutionId);
    }
  };

  const handleImageUpload = (result) => {
    setFormData(prev => ({
      ...prev,
      imageUrl: result?.previewUrl || result?.publicUrl || prev.imageUrl,
      s3ImageKey: result?.key || prev.s3ImageKey
    }));
  };

  const handleImageUploadError = (error) => {
    console.error('Error uploading image:', error);
    // Handle error (could show toast notification)
  };

  const handleSubmit = async () => {
    // Validar formulario antes de enviar
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (monument) {
        // Actualizar monumento existente
        await apiService.updateMonument(monument._id, formData);
      } else {
        // Crear nuevo monumento con estado "Oculto" por defecto
        const newMonumentData = {
          ...formData,
          status: 'Oculto' // Estado por defecto para monumentos nuevos
        };
        await apiService.createMonument(newMonumentData);
      }
      
      onSave(); // Recargar la lista
      onClose();
      
      // Mostrar mensaje informativo al crear
      if (!monument) {
        toast({
          title: "Monumento creado exitosamente",
          description: "Edita el monumento para agregar una imagen y modelo 3D para poder hacerlo disponible en la aplicación.",
          variant: "success"
        });
      } else {
        toast({
          title: "Monumento actualizado",
          description: "Los cambios se guardaron correctamente.",
          variant: "success"
        });
      }
    } catch (error) {
      console.error('Error saving monument:', error);
      toast({
        title: "Error",
        description: 'Error al guardar el monumento: ' + error.message,
        variant: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(monument);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nombre</Label>
          <Input 
            id="name" 
            placeholder="Nombre del monumento"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="categoryId">Categoría</Label>
          <Select 
            value={formData.categoryId} 
            onValueChange={(value) => handleInputChange('categoryId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category._id} value={category._id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="culture">Cultura</Label>
          <Input 
            id="culture" 
            placeholder="Ej: Inca, Moche, Colonial"
            value={formData.culture}
            onChange={(e) => handleInputChange('culture', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="institutionId">Institución</Label>
          <Select 
            value={formData.institutionId} 
            onValueChange={handleInstitutionChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar institución" />
            </SelectTrigger>
            <SelectContent>
              {institutions.map((institution) => (
                <SelectItem key={institution._id} value={institution._id}>
                  {institution.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="district">Distrito</Label>
          <Input 
            id="district" 
            placeholder="Distrito"
            value={formData.location.district}
            onChange={(e) => handleInputChange('location', { ...formData.location, district: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="address">Dirección</Label>
          <Input 
            id="address" 
            placeholder="Dirección completa"
            value={formData.location.address}
            onChange={(e) => handleInputChange('location', { ...formData.location, address: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lat">Latitud</Label>
          <Input 
            id="lat" 
            type="number"
            step="any"
            placeholder="-12.0464"
            value={formData.location.lat}
            onChange={(e) => handleInputChange('location', { ...formData.location, lat: parseFloat(e.target.value) || '' })}
          />
        </div>
        <div>
          <Label htmlFor="lng">Longitud</Label>
          <Input 
            id="lng" 
            type="number"
            step="any"
            placeholder="-77.0428"
            value={formData.location.lng}
            onChange={(e) => handleInputChange('location', { ...formData.location, lng: parseFloat(e.target.value) || '' })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="periodName">Período</Label>
          <Input 
            id="periodName" 
            placeholder="Ej: Horizonte Tardío"
            value={formData.period.name}
            onChange={(e) => handleInputChange('period', { ...formData.period, name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="startYear">Año inicio</Label>
          <Input 
            id="startYear" 
            type="number"
            placeholder="1200"
            value={formData.period.startYear}
            onChange={(e) => handleInputChange('period', { ...formData.period, startYear: parseInt(e.target.value) || '' })}
          />
        </div>
        <div>
          <Label htmlFor="endYear">Año fin</Label>
          <Input 
            id="endYear" 
            type="number"
            placeholder="1532"
            value={formData.period.endYear}
            onChange={(e) => handleInputChange('period', { ...formData.period, endYear: parseInt(e.target.value) || '' })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descripción</Label>
        <Textarea 
          id="description" 
          placeholder="Descripción del monumento o sitio histórico"
          rows={3}
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
        />
      </div>

      {/* Image Upload Section - Only show when editing */}
      {isEditing && (
        <div>
          <Label>Imagen del monumento</Label>
          <div className="mt-2">
            <ImageUpload
              currentImageUrl={formData.imageUrl}
              onUploadComplete={handleImageUpload}
              onUploadError={handleImageUploadError}
              disabled={isSubmitting}
              monumentId={monument?._id}
              entityType="monuments"
            />
          </div>
          {!formData.imageUrl && (
            <p className="text-sm text-muted-foreground mt-2">
              Agrega una imagen para poder hacer el monumento disponible
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isEditing ? 'Actualizando...' : 'Creando...'}
            </>
          ) : (
            isEditing ? 'Actualizar Monumento' : 'Crear Monumento'
          )}
        </Button>
      </div>
    </div>
  );
}

MonumentForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  monument: PropTypes.object,
  institutions: PropTypes.array.isRequired,
  categories: PropTypes.array.isRequired,
  onSave: PropTypes.func.isRequired,
  toast: PropTypes.func.isRequired,
};

export default MonumentsManager;

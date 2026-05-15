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
import { Slider } from './ui/slider';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MapPin,
  Box,
  Loader2,
  X
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import ImageUpload from './ImageUpload';
import { toast } from 'sonner';
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

const TIMELINE_MIN_YEAR = -3000;
const TIMELINE_MAX_YEAR = new Date().getFullYear();

const formatYearLabel = (yearValue) => {
  const year = Number(yearValue);
  if (!Number.isFinite(year)) return '';
  return year < 0 ? `${Math.abs(year)} a.C.` : `${year} d.C.`;
};

const getPeriodDisplay = (period) => {
  if (!period) return 'No identificado';
  if (period.isIdentified === false) return 'No identificado';

  const startYear = Number(period.startYear);
  const endYear = Number(period.endYear);
  const hasStartYear = Number.isFinite(startYear);
  const hasEndYear = Number.isFinite(endYear);

  if (hasStartYear && hasEndYear) {
    return `${formatYearLabel(startYear)} - ${formatYearLabel(endYear)}`;
  }

  if (hasStartYear) {
    return formatYearLabel(startYear);
  }

  if (period.name) {
    return period.name;
  }

  return 'No identificado';
};

const getCultureDisplay = (monument) => {
  const cultures = Array.isArray(monument?.cultures)
    ? monument.cultures.filter(Boolean)
    : [];

  if (cultures.length > 0) {
    return cultures.join(', ');
  }

  if (monument?.culture) {
    return monument.culture;
  }

  return 'Sin cultura definida';
};

function MonumentsManager() {
  const [monuments, setMonuments] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cultures, setCultures] = useState([]);
  const [stats, setStats] = useState({ total: 0, available: 0, hidden: 0, withModel3D: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMonuments, setTotalMonuments] = useState(0);
  const pageSize = 10;
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMonument, setEditingMonument] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Cargar catálogos para formularios
  useEffect(() => {
    loadReferenceData();
  }, []);

  // Cargar lista paginada y estadísticas al cambiar filtros o página
  useEffect(() => {
    loadData();
  }, [currentPage, selectedCategory, selectedStatus, debouncedSearchTerm]);

  // Debounce del texto de búsqueda para no consultar en cada tecla
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchTerm(searchTerm);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Si cambian filtros, reiniciar a primera página
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedStatus]);

  const loadReferenceData = async () => {
    try {
      const [institutionsData, categoriesData, culturesData] = await Promise.all([
        apiService.getInstitutions({ availableOnly: true }),
        apiService.getCategories({ activeOnly: true }),
        apiService.getCultures({ activeOnly: true })
      ]);

      setInstitutions(institutionsData.items || institutionsData || []);
      setCategories(categoriesData.items || categoriesData || []);
      setCultures(culturesData.items || culturesData || []);
    } catch (error) {
      console.error('Error loading reference data:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const queryParams = {
        page: currentPage,
        limit: pageSize,
      };

      if (debouncedSearchTerm.trim()) {
        queryParams.text = debouncedSearchTerm.trim();
      }

      if (selectedStatus !== 'all') {
        queryParams.status = selectedStatus;
      }

      if (selectedCategory !== 'all') {
        queryParams.categoryId = selectedCategory;
      }

      const [monumentsData, statsData] = await Promise.all([
        apiService.getMonuments(queryParams),
        apiService.getMonumentStats(selectedCategory !== 'all' ? { categoryId: selectedCategory } : {})
      ]);
      
      setMonuments(monumentsData.items || monumentsData || []);
      setTotalMonuments(monumentsData.total || 0);
      setStats({
        total: statsData.total || 0,
        available: statsData.available || 0,
        hidden: statsData.hidden || 0,
        withModel3D: statsData.withModel3D || 0
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Orden local para mantener monumentos con modelo primero
  const filteredMonuments = [...monuments].sort((a, b) => {
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
      await loadData();
      toast.success("Estado actualizado", {
        description: `El monumento ahora está ${newStatus.toLowerCase()}`,
      });
    } catch (error) {
      console.error('Error updating monument status:', error);
      toast.error("Error", {
        description: error.message || 'Error al cambiar el estado del monumento',
      });
      // Recargar para asegurar consistencia
      loadData();
    }
  };

  // Eliminar monumento
  const handleDelete = async (id) => {
    try {
      await apiService.deleteMonument(id);

      if (monuments.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else {
        await loadData();
      }
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

  const totalPages = Math.max(1, Math.ceil(totalMonuments / pageSize));

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
              cultures={cultures}
              onClose={() => setIsCreateDialogOpen(false)}
              onSave={loadData}
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
              cultures={cultures}
              onClose={handleCloseEdit}
              onSave={loadData}
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
                <p className="text-2xl font-bold">{stats.total}</p>
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
                  {stats.available}
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
                  {stats.hidden}
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
                  {stats.withModel3D}
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
            Página {currentPage} de {totalPages} • {totalMonuments} monumentos en total
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
                            {getCultureDisplay(monument)}
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
                      {getPeriodDisplay(monument.period)}
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

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {filteredMonuments.length} de {totalMonuments}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={loading || currentPage <= 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={loading || currentPage >= totalPages}
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MonumentForm({ onClose, monument = null, institutions = [], categories = [], cultures = [], onSave }) {
  const initialCultures = Array.isArray(monument?.cultures)
    ? monument.cultures.filter(Boolean)
    : monument?.culture
      ? [monument.culture]
      : [];

  const initialStartYear = monument?.period?.startYear;
  const initialEndYear = monument?.period?.endYear;
  const initialIsIdentified = monument?.period?.isIdentified
    ?? (monument ? Boolean(initialStartYear || initialEndYear) : true);
  const initialDiscoveryDate = (() => {
    if (!monument?.discovery?.discoveredAt) return '';
    const parsedDate = new Date(monument.discovery.discoveredAt);
    if (Number.isNaN(parsedDate.getTime())) return '';
    return parsedDate.toISOString().slice(0, 10);
  })();
  const initialDiscoveryPrecision = monument?.discovery?.datePrecision
    || (monument?.discovery?.isDateKnown ? 'exact' : 'unknown');
  const initialDiscoveryYear = monument?.discovery?.discoveredYear
    ?? (initialDiscoveryDate ? Number(initialDiscoveryDate.slice(0, 4)) : '');
  const initialDiscoveryMonth = monument?.discovery?.discoveredMonth
    ?? (initialDiscoveryDate ? Number(initialDiscoveryDate.slice(5, 7)) : '');

  const [formData, setFormData] = useState({
    name: monument?.name || '',
    categoryId: monument?.categoryId || '',
    description: monument?.description || '',
    cultures: initialCultures,
    institutionId: monument?.institutionId || '',
    location: {
      lat: monument?.location?.lat || '',
      lng: monument?.location?.lng || '',
      address: monument?.location?.address || '',
      district: monument?.location?.district || ''
    },
    period: {
      name: monument?.period?.name || '',
      isIdentified: initialIsIdentified,
      startYear: initialStartYear ?? '',
      endYear: initialEndYear ?? ''
    },
    discovery: {
      isDateKnown: monument?.discovery?.isDateKnown ?? Boolean(initialDiscoveryDate),
      datePrecision: initialDiscoveryPrecision,
      discoveredAt: initialDiscoveryDate,
      discoveredYear: initialDiscoveryYear,
      discoveredMonth: initialDiscoveryMonth,
      isDiscovererKnown: monument?.discovery?.isDiscovererKnown ?? Boolean(monument?.discovery?.discovererName),
      discovererName: monument?.discovery?.discovererName || ''
    },
    imageUrl: monument?.imageUrl || null,
    s3ImageKey: monument?.s3ImageKey || null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCultureToAdd, setSelectedCultureToAdd] = useState('');

  const sanitizeYearInput = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? '' : parsed;
  };

  const getTimelineRange = () => {
    const startYear = sanitizeYearInput(formData.period.startYear);
    const endYear = sanitizeYearInput(formData.period.endYear);
    const safeStart = startYear === '' ? 1200 : startYear;
    const safeEnd = endYear === '' ? safeStart : endYear;
    return [Math.min(safeStart, safeEnd), Math.max(safeStart, safeEnd)];
  };

  // Validaciones
  const validateForm = () => {
    // Validar nombre
    if (!formData.name.trim()) {
      toast.warning("Error de validación", {
        description: "El nombre del monumento es requerido"
      });
      return false;
    }

    // Validar categoría
    if (!formData.categoryId) {
      toast.warning("Error de validación", {
        description: "Debes seleccionar una categoría"
      });
      return false;
    }

    // Validar descripción
    if (!formData.description.trim()) {
      toast.warning("Error de validación", {
        description: "La descripción es requerida"
      });
      return false;
    }

    // Validar institución
    if (!formData.institutionId) {
      toast.warning("Error de validación", {
        description: "Debes seleccionar una institución"
      });
      return false;
    }

    // Validar culturas
    if (formData.cultures.length === 0) {
      toast.warning("Error de validación", {
        description: "Debes agregar al menos una cultura"
      });
      return false;
    }

    // Validar dirección y distrito
    if (!formData.location.address.trim() || !formData.location.district.trim()) {
      toast.warning("Error de validación", {
        description: "La dirección y el distrito son requeridos"
      });
      return false;
    }

    // Validar coordenadas
    if (!formData.location.lat || !formData.location.lng) {
      toast.warning("Error de validación", {
        description: "Debes proporcionar tanto latitud como longitud"
      });
      return false;
    }

    // Validar nombre del periodo
    if (!formData.period.name.trim()) {
      toast.warning("Error de validación", {
        description: "El nombre del periodo es requerido"
      });
      return false;
    }

    // Validar cronología identificada
    if (formData.period.isIdentified && 
        ((!formData.period.startYear && formData.period.startYear !== 0) || 
         (!formData.period.endYear && formData.period.endYear !== 0))) {
      toast.warning("Error de validación", {
        description: "Debes ingresar tanto el año de inicio como el de fin en la línea de tiempo o marcar como no identificado"
      });
      return false;
    }

    // Validar años del período
    if (formData.period.isIdentified && formData.period.startYear !== '' && formData.period.endYear !== '') {
      const startYear = parseInt(formData.period.startYear);
      const endYear = parseInt(formData.period.endYear);
      
      if (endYear < startYear) {
        toast.warning("Error de validación", {
          description: "El año de fin no puede ser menor al año de inicio"
        });
        return false;
      }
    }

    if (formData.discovery.datePrecision === 'exact' && !formData.discovery.discoveredAt) {
      toast.warning("Error de validación", {
        description: "Debes ingresar la fecha exacta de descubrimiento"
      });
      return false;
    }

    if (formData.discovery.datePrecision === 'month') {
      if (!formData.discovery.discoveredYear || !formData.discovery.discoveredMonth) {
        toast.warning("Error de validación", {
          description: "Debes ingresar mes y año de descubrimiento"
        });
        return false;
      }
    }

    if (formData.discovery.datePrecision === 'year' && !formData.discovery.discoveredYear) {
      toast.warning("Error de validación", {
        description: "Debes ingresar el año de descubrimiento"
      });
      return false;
    }

    if (formData.discovery.isDiscovererKnown && !formData.discovery.discovererName.trim()) {
      toast.warning("Error de validación", {
        description: "Debes ingresar el nombre del descubridor o marcarlo como desconocido"
      });
      return false;
    }

    return true;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddCulture = (cultureName) => {
    if (!cultureName) return;

    const existsInCatalog = cultures.some(
      (culture) => culture.name.toLowerCase() === String(cultureName).toLowerCase()
    );

    if (!existsInCatalog) {
      setSelectedCultureToAdd('');
      return;
    }

    const alreadyExists = formData.cultures.some(
      (culture) => culture.toLowerCase() === cultureName.toLowerCase()
    );

    if (alreadyExists) {
      setSelectedCultureToAdd('');
      return;
    }

    setFormData(prev => ({
      ...prev,
      cultures: [...prev.cultures, cultureName]
    }));
    setSelectedCultureToAdd('');
  };

  const handleRemoveCulture = (cultureName) => {
    setFormData(prev => ({
      ...prev,
      cultures: prev.cultures.filter((culture) => culture !== cultureName)
    }));
  };

  const handlePeriodChange = (partialPeriod) => {
    setFormData(prev => ({
      ...prev,
      period: {
        ...prev.period,
        ...partialPeriod
      }
    }));
  };

  const handleDiscoveryChange = (partialDiscovery) => {
    setFormData(prev => ({
      ...prev,
      discovery: {
        ...prev.discovery,
        ...partialDiscovery
      }
    }));
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
      const payload = {
        ...formData,
        culture: formData.cultures[0] || null,
        cultures: formData.cultures,
        period: {
          ...formData.period,
          isIdentified: Boolean(formData.period.isIdentified),
          startYear: formData.period.isIdentified ? sanitizeYearInput(formData.period.startYear) : null,
          endYear: formData.period.isIdentified ? sanitizeYearInput(formData.period.endYear) : null
        },
        discovery: {
          ...formData.discovery,
          isDateKnown: formData.discovery.datePrecision !== 'unknown',
          datePrecision: formData.discovery.datePrecision,
          discoveredAt:
            formData.discovery.datePrecision === 'exact'
              ? formData.discovery.discoveredAt
              : formData.discovery.datePrecision === 'month'
                ? `${String(formData.discovery.discoveredYear).padStart(4, '0')}-${String(formData.discovery.discoveredMonth).padStart(2, '0')}-01`
                : formData.discovery.datePrecision === 'year'
                  ? `${String(formData.discovery.discoveredYear).padStart(4, '0')}-01-01`
                  : null,
          discoveredYear:
            formData.discovery.datePrecision === 'unknown'
              ? null
              : (formData.discovery.discoveredYear === '' || formData.discovery.discoveredYear === null || formData.discovery.discoveredYear === undefined
                ? null
                : Number(formData.discovery.discoveredYear)),
          discoveredMonth:
            formData.discovery.datePrecision === 'month'
              ? (formData.discovery.discoveredMonth === '' || formData.discovery.discoveredMonth === null || formData.discovery.discoveredMonth === undefined
                ? null
                : Number(formData.discovery.discoveredMonth))
              : null,
          isDiscovererKnown: Boolean(formData.discovery.isDiscovererKnown),
          discovererName: formData.discovery.isDiscovererKnown ? formData.discovery.discovererName.trim() : null
        }
      };

      if (monument) {
        // Actualizar monumento existente
        await apiService.updateMonument(monument._id, payload);
      } else {
        // Crear nuevo monumento con estado "Oculto" por defecto
        const newMonumentData = {
          ...payload,
          status: 'Oculto' // Estado por defecto para monumentos nuevos
        };
        await apiService.createMonument(newMonumentData);
      }
      
      onSave(); // Recargar la lista
      onClose();
      
      // Mostrar mensaje informativo al crear
      if (!monument) {
        toast.success("Monumento creado exitosamente", {
          description: "Edita el monumento para agregar una imagen y modelo 3D para poder hacerlo disponible en la aplicación.",
        });
      } else {
        toast.success("Monumento actualizado", {
          description: "Los cambios se guardaron correctamente.",
        });
      }
    } catch (error) {
      console.error('Error saving monument:', error);
      toast.error("Error", {
        description: 'Error al guardar el monumento: ' + error.message,
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
          <Label htmlFor="name">Nombre <span className="text-destructive">*</span></Label>
          <Input 
            id="name" 
            placeholder="Nombre del monumento"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="categoryId">Categoría <span className="text-destructive">*</span></Label>
          <Select 
            value={formData.categoryId} 
            onValueChange={(value) => handleInputChange('categoryId', value)}
            required
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
          <Label htmlFor="cultureSelect">Culturas <span className="text-destructive">*</span></Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Select
                value={selectedCultureToAdd || 'none'}
                onValueChange={(value) => setSelectedCultureToAdd(value === 'none' ? '' : value)}
                required
              >
                <SelectTrigger id="cultureSelect">
                  <SelectValue placeholder="Seleccionar cultura existente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seleccionar cultura</SelectItem>
                  {cultures
                    .filter((culture) => !formData.cultures.some(
                      (selected) => selected.toLowerCase() === culture.name.toLowerCase()
                    ))
                    .map((culture) => (
                      <SelectItem key={culture._id} value={culture.name}>
                        {culture.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddCulture(selectedCultureToAdd)}
                disabled={!selectedCultureToAdd}
              >
                Agregar
              </Button>
            </div>

            {cultures.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay culturas activas disponibles. Crea una en Gestión de Culturas.
              </p>
            )}

            {formData.cultures.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.cultures.map((cultureName) => (
                  <Badge key={cultureName} variant="outline" className="gap-2 pr-1">
                    <span>{cultureName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => handleRemoveCulture(cultureName)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <Label htmlFor="institutionId">Institución <span className="text-destructive">*</span></Label>
          <Select 
            value={formData.institutionId} 
            onValueChange={handleInstitutionChange}
            required
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
          <Label htmlFor="district">Distrito <span className="text-destructive">*</span></Label>
          <Input 
            id="district" 
            placeholder="Distrito"
            value={formData.location.district}
            onChange={(e) => handleInputChange('location', { ...formData.location, district: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="address">Dirección <span className="text-destructive">*</span></Label>
          <Input 
            id="address" 
            placeholder="Dirección completa"
            value={formData.location.address}
            onChange={(e) => handleInputChange('location', { ...formData.location, address: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lat">Latitud <span className="text-destructive">*</span></Label>
          <Input 
            id="lat" 
            type="number"
            step="any"
            placeholder="-12.0464"
            value={formData.location.lat}
            onChange={(e) => handleInputChange('location', { ...formData.location, lat: parseFloat(e.target.value) || '' })}
            required
          />
        </div>
        <div>
          <Label htmlFor="lng">Longitud <span className="text-destructive">*</span></Label>
          <Input 
            id="lng" 
            type="number"
            step="any"
            placeholder="-77.0428"
            value={formData.location.lng}
            onChange={(e) => handleInputChange('location', { ...formData.location, lng: parseFloat(e.target.value) || '' })}
            required
          />
        </div>
      </div>

      <div className="space-y-4 border rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="periodName">Período <span className="text-destructive">*</span></Label>
            <Input
              id="periodName"
              placeholder="Ej: Horizonte Tardío"
              value={formData.period.name}
              onChange={(e) => handlePeriodChange({ name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Cronología identificada</Label>
            <Select
              value={formData.period.isIdentified ? 'identified' : 'unknown'}
              onValueChange={(value) => {
                const isIdentified = value === 'identified';
                handlePeriodChange({
                  isIdentified,
                  startYear: isIdentified ? (formData.period.startYear === '' ? 1200 : formData.period.startYear) : '',
                  endYear: isIdentified ? (formData.period.endYear === '' ? (formData.period.startYear === '' ? 1200 : formData.period.startYear) : formData.period.endYear) : ''
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="identified">Identificada</SelectItem>
                <SelectItem value="unknown">No identificada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {formData.period.isIdentified ? (
          <div className="space-y-4">
            <div>
              <Label>Línea de tiempo</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Selecciona el rango histórico de la huaca
              </p>
              <Slider
                min={TIMELINE_MIN_YEAR}
                max={TIMELINE_MAX_YEAR}
                step={1}
                value={getTimelineRange()}
                onValueChange={([startYear, endYear]) => {
                  handlePeriodChange({ startYear, endYear });
                }}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{formatYearLabel(TIMELINE_MIN_YEAR)}</span>
                <span>{formatYearLabel(TIMELINE_MAX_YEAR)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startYear">Año inicio <span className="text-destructive">*</span></Label>
                <Input
                  id="startYear"
                  type="number"
                  placeholder="1200"
                  value={formData.period.startYear}
                  onChange={(e) => handlePeriodChange({ startYear: sanitizeYearInput(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endYear">Año fin <span className="text-destructive">*</span></Label>
                <Input
                  id="endYear"
                  type="number"
                  placeholder="1532"
                  value={formData.period.endYear}
                  onChange={(e) => handlePeriodChange({ endYear: sanitizeYearInput(e.target.value) })}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Rango seleccionado: {formatYearLabel(getTimelineRange()[0])} - {formatYearLabel(getTimelineRange()[1])}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Esta huaca se registrará con cronología no identificada.
          </p>
        )}
      </div>

      <div className="space-y-4 border rounded-lg p-4">
        <h3 className="text-sm font-medium">Datos de descubrimiento</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Fecha de descubrimiento <span className="text-destructive">*</span></Label>
            <Select
              value={formData.discovery.datePrecision}
              onValueChange={(value) => handleDiscoveryChange({
                datePrecision: value,
                isDateKnown: value !== 'unknown',
                discoveredAt: value === 'exact' ? formData.discovery.discoveredAt : '',
                discoveredYear: value === 'unknown' ? '' : formData.discovery.discoveredYear,
                discoveredMonth: value === 'month' ? formData.discovery.discoveredMonth : ''
              })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exact">Fecha exacta</SelectItem>
                <SelectItem value="month">Mes y año</SelectItem>
                <SelectItem value="year">Solo año</SelectItem>
                <SelectItem value="unknown">Desconocida</SelectItem>
              </SelectContent>
            </Select>
            {formData.discovery.datePrecision === 'exact' ? (
              <Input
                className="mt-2"
                type="date"
                value={formData.discovery.discoveredAt}
                onChange={(e) => handleDiscoveryChange({ discoveredAt: e.target.value })}
                required
              />
            ) : formData.discovery.datePrecision === 'month' ? (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Select
                  value={formData.discovery.discoveredMonth ? String(formData.discovery.discoveredMonth) : 'none'}
                  onValueChange={(value) => handleDiscoveryChange({ discoveredMonth: value === 'none' ? '' : Number(value) })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Mes</SelectItem>
                    <SelectItem value="1">Enero</SelectItem>
                    <SelectItem value="2">Febrero</SelectItem>
                    <SelectItem value="3">Marzo</SelectItem>
                    <SelectItem value="4">Abril</SelectItem>
                    <SelectItem value="5">Mayo</SelectItem>
                    <SelectItem value="6">Junio</SelectItem>
                    <SelectItem value="7">Julio</SelectItem>
                    <SelectItem value="8">Agosto</SelectItem>
                    <SelectItem value="9">Setiembre</SelectItem>
                    <SelectItem value="10">Octubre</SelectItem>
                    <SelectItem value="11">Noviembre</SelectItem>
                    <SelectItem value="12">Diciembre</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  max="9999"
                  placeholder="Año"
                  value={formData.discovery.discoveredYear}
                  onChange={(e) => handleDiscoveryChange({ discoveredYear: e.target.value })}
                  required
                />
              </div>
            ) : formData.discovery.datePrecision === 'year' ? (
              <Input
                className="mt-2"
                type="number"
                min="1"
                max="9999"
                placeholder="Año"
                value={formData.discovery.discoveredYear}
                onChange={(e) => handleDiscoveryChange({ discoveredYear: e.target.value })}
                required
              />
            ) : (
              <p className="text-xs text-muted-foreground mt-2">Se guardará como fecha no identificada.</p>
            )}
          </div>

          <div>
            <Label>Nombre del descubridor <span className="text-destructive">*</span></Label>
            <Select
              value={formData.discovery.isDiscovererKnown ? 'known' : 'unknown'}
              onValueChange={(value) => handleDiscoveryChange({
                isDiscovererKnown: value === 'known',
                discovererName: value === 'known' ? formData.discovery.discovererName : ''
              })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="known">Conocido</SelectItem>
                <SelectItem value="unknown">Desconocido</SelectItem>
              </SelectContent>
            </Select>
            {formData.discovery.isDiscovererKnown ? (
              <Input
                className="mt-2"
                placeholder="Nombre del descubridor"
                value={formData.discovery.discovererName}
                onChange={(e) => handleDiscoveryChange({ discovererName: e.target.value })}
                required
              />
            ) : (
              <p className="text-xs text-muted-foreground mt-2">Se guardará como descubridor no identificado.</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descripción <span className="text-destructive">*</span></Label>
        <Textarea 
          id="description" 
          placeholder="Descripción del monumento o sitio histórico"
          rows={3}
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          required
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
  cultures: PropTypes.array.isRequired,
  onSave: PropTypes.func.isRequired
};

export default MonumentsManager;

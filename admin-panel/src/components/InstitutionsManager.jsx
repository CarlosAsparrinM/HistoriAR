/**
 * Gestor de Instituciones (InstitutionsManager)
 * 
 * Permite listar, filtrar y administrar instituciones (museos, universidades, etc.).
 * Incluye gestión de horarios, imágenes, ubicación y estados.
 */
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
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
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Edit,
  Trash2,
  Building,
  Loader2,
  Eye,
  Clock,
  X
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import ImageUpload from './ImageUpload';
import { toast } from 'sonner';
import apiService from '../services/api';
import PropTypes from 'prop-types';

// Lista de distritos de Lima
const LIMA_DISTRICTS = [
  'Ancón',
  'Ate',
  'Barranco',
  'Breña',
  'Carabayllo',
  'Chaclacayo',
  'Chorrillos',
  'Cieneguilla',
  'Comas',
  'El Agustino',
  'Independencia',
  'Jesús María',
  'La Molina',
  'La Victoria',
  'Lima (Cercado de Lima)',
  'Lince',
  'Los Olivos',
  'Lurigancho-Chosica',
  'Lurín',
  'Magdalena del Mar',
  'Miraflores',
  'Pachacámac',
  'Pucusana',
  'Pueblo Libre',
  'Puente Piedra',
  'Punta Hermosa',
  'Punta Negra',
  'Rímac',
  'San Bartolo',
  'San Borja',
  'San Isidro',
  'San Juan de Lurigancho',
  'San Juan de Miraflores',
  'San Luis',
  'San Martín de Porres',
  'San Miguel',
  'Santa Anita',
  'Santa María del Mar',
  'Santa Rosa',
  'Santiago de Surco',
  'Surquillo',
  'Villa El Salvador',
  'Villa María del Triunfo'
];

// Etiquetas legibles para los tipos
const typeLabels = {
  'Museo': 'Museo',
  'Universidad': 'Universidad',
  'Municipalidad': 'Municipalidad',
  'Otro': 'Otro'
};

// Mapeo de color de badge por estado
const statusColors = {
  'Disponible': 'default',
  'Oculto': 'secondary',
  'Borrado': 'destructive'
};

function InstitutionsManager() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInstitutions, setTotalInstitutions] = useState(0);
  const [stats, setStats] = useState({ total: 0, available: 0, hidden: 0, museums: 0 });
  const pageSize = 10;
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchTerm(searchTerm);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    loadData();
  }, [currentPage, selectedType, selectedStatus, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedType, selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const queryParams = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearchTerm.trim() || undefined,
        type: selectedType,
        status: selectedStatus,
      };

      const [data, statsData] = await Promise.all([
        apiService.getInstitutions(queryParams),
        apiService.getInstitutionStats()
      ]);

      setInstitutions(data.items || data || []);
      setTotalInstitutions(data.total || 0);
      setStats({
        total: statsData.total || 0,
        available: statsData.available || 0,
        hidden: statsData.hidden || 0,
        museums: statsData.museums || 0
      });
    } catch (error) {
      console.error('Error loading institutions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInstitutions = institutions;

  // Cambiar estado de la institución
  const handleStatusChange = async (id, newStatus) => {
    try {
      await apiService.updateInstitution(id, { status: newStatus });
      setInstitutions(prev => 
        prev.map(institution => 
          institution._id === id 
            ? { ...institution, status: newStatus }
            : institution
        )
      );
      toast.success("Estado actualizado", {
        description: `La institución ahora está ${newStatus.toLowerCase()}`,
      });
    } catch (error) {
      console.error('Error updating institution status:', error);
      toast.error("Error", {
        description: error.message || 'Error al cambiar el estado de la institución',
      });
      loadData();
    }
  };

  // Eliminar institución
  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta institución?')) return;
    
    try {
      await apiService.deleteInstitution(id);
      setInstitutions(prev => prev.filter(institution => institution._id !== id));
    } catch (error) {
      console.error('Error deleting institution:', error);
      alert('Error al eliminar la institución');
    }
  };

  // Abrir diálogo de edición
  const handleEdit = (institution) => {
    setEditingInstitution(institution);
    setIsEditDialogOpen(true);
  };

  // Cerrar diálogo de edición
  const handleCloseEdit = () => {
    setEditingInstitution(null);
    setIsEditDialogOpen(false);
  };

  const totalPages = Math.max(1, Math.ceil(totalInstitutions / pageSize));

  // Verificar si la institución está completa
  const isInstitutionComplete = (institution) => {
    if (!institution.imageUrl) return false;
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const hasSchedule = days.some(day => 
      institution.schedule?.[day] && 
      !institution.schedule[day].closed && 
      institution.schedule[day].open && 
      institution.schedule[day].close
    );
    
    return hasSchedule;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Gestión de Instituciones</h1>
          <p className="text-muted-foreground">
            Administra las instituciones asociadas a los monumentos
          </p>
        </div>
        
        {/* Diálogo de creación de institución */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Institución
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Crear Nueva Institución</DialogTitle>
              <DialogDescription>
                Añade una nueva institución al sistema
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto flex-1">
              <InstitutionForm 
              onClose={() => setIsCreateDialogOpen(false)}
              onSave={loadData}
            />
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de edición de institución */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Editar Institución</DialogTitle>
              <DialogDescription>
                Modifica la información de la institución seleccionada
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 pr-2">
              <InstitutionForm 
              institution={editingInstitution}
              onClose={handleCloseEdit}
              onSave={loadData}
            />
            </div>
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
                placeholder="Buscar instituciones por nombre o distrito..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="Museo">Museos</SelectItem>
                <SelectItem value="Universidad">Universidades</SelectItem>
                <SelectItem value="Municipalidad">Municipalidades</SelectItem>
                <SelectItem value="Otro">Otros</SelectItem>
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
                <Building className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Total Instituciones</p>
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
                <p className="text-sm font-medium">Ocultas</p>
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
                <Building className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Museos</p>
                <p className="text-2xl font-bold">
                  {stats.museums}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de instituciones */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Instituciones</CardTitle>
          <CardDescription>
            Página {currentPage} de {totalPages} • {totalInstitutions} instituciones en total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Institución</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Distrito</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    <p className="mt-2 text-muted-foreground">Cargando instituciones...</p>
                  </TableCell>
                </TableRow>
              ) : filteredInstitutions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">No se encontraron instituciones</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInstitutions.map((institution) => (
                  <TableRow key={institution._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ImageWithFallback
                          src={institution.imageUrl || '/placeholder-institution.jpg'}
                          alt={institution.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-medium">{institution.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {institution.description?.substring(0, 50)}
                            {institution.description?.length > 50 ? '...' : ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {typeLabels[institution.type] || institution.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{institution.location?.district || 'Sin distrito'}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[institution.status] || 'secondary'}>
                        {institution.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {institution.contactEmail && (
                          <p>{institution.contactEmail}</p>
                        )}
                        {institution.phone && (
                          <p className="text-muted-foreground">{institution.phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(institution)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {institution.status === 'Oculto' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(institution._id, 'Disponible')}
                              disabled={!isInstitutionComplete(institution)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Hacer disponible
                              {!isInstitutionComplete(institution) && (
                                <span className="ml-2 text-xs">(requiere imagen y horarios)</span>
                              )}
                            </DropdownMenuItem>
                          )}
                          {institution.status === 'Disponible' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(institution._id, 'Oculto')}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ocultar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(institution._id)}
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
              Mostrando {filteredInstitutions.length} de {totalInstitutions}
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

/**
 * Componente DistrictSelector - Select filtrable de distritos de Lima
 */
function DistrictSelector({ value, onChange, required = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  const filteredDistricts = LIMA_DISTRICTS.filter(district =>
    district.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (district) => {
    onChange(district);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleInputBlur = () => {
    // Si escribe algo que no es un distrito válido, limpiar
    if (searchTerm && !LIMA_DISTRICTS.includes(searchTerm)) {
      setSearchTerm('');
    }
  };

  // Cerrar dropdown cuando se hace click afuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        handleInputBlur();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, searchTerm]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Label htmlFor="district">Distrito {required && <span className="text-destructive">*</span>}</Label>
      <div className="relative">
        <Input
          id="district"
          placeholder="Buscar o seleccionar distrito"
          value={isOpen ? searchTerm : value}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={handleInputBlur}
          className="pr-8"
          autoComplete="off"
          required={required}
        />
        {(value || searchTerm) && (
          <button
            onClick={() => {
              onChange('');
              setSearchTerm('');
              setIsOpen(false);
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            type="button"
            tabIndex="-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-md bg-white shadow-lg max-h-60 overflow-y-auto">
          {filteredDistricts.length > 0 ? (
            filteredDistricts.map((district) => (
              <button
                key={district}
                onClick={() => handleSelect(district)}
                className={`w-full text-left px-3 py-2 hover:bg-slate-100 transition-colors ${
                  value === district ? 'bg-blue-50 font-medium' : ''
                }`}
                type="button"
              >
                {district}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No se encontraron distritos
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InstitutionForm({ onClose, institution = null, onSave }) {
  const [formData, setFormData] = useState({
    name: institution?.name || '',
    type: institution?.type || 'Museo',
    description: institution?.description || '',
    contactEmail: institution?.contactEmail || '',
    phone: institution?.phone || '',
    website: institution?.website || '',
    imageUrl: institution?.imageUrl || null,
    location: {
      lat: institution?.location?.lat || '',
      lng: institution?.location?.lng || '',
      address: institution?.location?.address || '',
      district: institution?.location?.district || ''
    },
    schedule: {
      monday: institution?.schedule?.monday || { closed: true },
      tuesday: institution?.schedule?.tuesday || { closed: true },
      wednesday: institution?.schedule?.wednesday || { closed: true },
      thursday: institution?.schedule?.thursday || { closed: true },
      friday: institution?.schedule?.friday || { closed: true },
      saturday: institution?.schedule?.saturday || { closed: true },
      sunday: institution?.schedule?.sunday || { closed: true }
    }
    ,
    s3ImageKey: institution?.s3ImageKey || null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      location: { ...prev.location, [field]: value }
    }));
  };

  const handleScheduleChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day],
          [field]: value
        }
      }
    }));
  };

  const handleDayClosedToggle = (day, checked) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day],
          closed: checked,
          ...(checked ? { open: '', close: '' } : {})
        }
      }
    }));
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
  };

  const handleSubmit = async () => {
    // Validar campos requeridos SIEMPRE
    if (!formData.name.trim()) {
      toast.warning("Error de validación", {
        description: "El nombre de la institución es requerido"
      });
      return;
    }

    if (!formData.type) {
      toast.warning("Error de validación", {
        description: "El tipo de institución es requerido"
      });
      return;
    }

    if (!formData.location.address?.trim()) {
      toast.warning("Error de validación", {
        description: "La dirección es requerida"
      });
      return;
    }

    if (!formData.location.district?.trim()) {
      toast.warning("Error de validación", {
        description: "El distrito es requerido"
      });
      return;
    }

    if (!formData.location.lat || !formData.location.lng) {
      toast.warning("Error de validación", {
        description: "La ubicación (latitud y longitud) es requerida"
      });
      return;
    }

    if (!formData.description?.trim()) {
      toast.warning("Error de validación", {
        description: "La descripción es requerida"
      });
      return;
    }

    if (!formData.contactEmail?.trim()) {
      toast.warning("Error de validación", {
        description: "El email de contacto es requerido"
      });
      return;
    }

    if (!formData.phone?.trim()) {
      toast.warning("Error de validación", {
        description: "El teléfono es requerido"
      });
      return;
    }

    if (!formData.website?.trim()) {
      toast.warning("Error de validación", {
        description: "El sitio web es requerido"
      });
      return;
    }

    // Validar horarios si estamos editando
    if (institution) {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const dayLabelsValidation = {
        monday: 'Lunes',
        tuesday: 'Martes',
        wednesday: 'Miércoles',
        thursday: 'Jueves',
        friday: 'Viernes',
        saturday: 'Sábado',
        sunday: 'Domingo'
      };
      
      // Verificar que los días marcados como abiertos tengan horarios completos
      const invalidDays = days.filter(day => {
        const schedule = formData.schedule[day];
        return schedule && !schedule.closed && (!schedule.open || !schedule.close);
      });
      
      if (invalidDays.length > 0) {
        const dayNames = invalidDays.map(day => dayLabelsValidation[day]).join(', ');
        toast.warning("Error de validación", {
          description: `Los siguientes días están marcados como abiertos pero no tienen horarios completos: ${dayNames}. Por favor, completa los horarios o marca los días como cerrados.`,
        });
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      if (institution) {
        await apiService.updateInstitution(institution._id, formData);
      } else {
        await apiService.createInstitution(formData);
      }
      
      onSave();
      onClose();

      if (!institution) {
        toast.success("Institución creada exitosamente", {
          description: "Edita la institución para agregar imagen y horarios de atención para poder hacerla disponible.",
        });
      } else {
        toast.success("Institución actualizada", {
          description: "Los cambios se guardaron correctamente.",
        });
      }
    } catch (error) {
      console.error('Error saving institution:', error);
      toast.error("Error", {
        description: 'Error al guardar la institución: ' + error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(institution);

  const dayLabels = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nombre <span className="text-destructive">*</span></Label>
          <Input 
            id="name" 
            placeholder="Nombre de la institución"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="type">Tipo <span className="text-destructive">*</span></Label>
          <Select 
            value={formData.type} 
            onValueChange={(value) => handleInputChange('type', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Museo">Museo</SelectItem>
              <SelectItem value="Universidad">Universidad</SelectItem>
              <SelectItem value="Municipalidad">Municipalidad</SelectItem>
              <SelectItem value="Otro">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DistrictSelector 
          value={formData.location.district}
          onChange={(district) => handleLocationChange('district', district)}
          required
        />
        <div>
          <Label htmlFor="phone">Teléfono <span className="text-destructive">*</span></Label>
          <Input 
            id="phone" 
            placeholder="(01) 123-4567"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="address">Dirección <span className="text-destructive">*</span></Label>
        <Input 
          id="address" 
          placeholder="Dirección completa"
          value={formData.location.address}
          onChange={(e) => handleLocationChange('address', e.target.value)}
          required
        />
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
            onChange={(e) => handleLocationChange('lat', parseFloat(e.target.value) || '')}
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
            onChange={(e) => handleLocationChange('lng', parseFloat(e.target.value) || '')}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contactEmail">Email de contacto <span className="text-destructive">*</span></Label>
          <Input 
            id="contactEmail" 
            type="email"
            placeholder="contacto@institucion.pe"
            value={formData.contactEmail}
            onChange={(e) => handleInputChange('contactEmail', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="website">Sitio web <span className="text-destructive">*</span></Label>
          <Input 
            id="website" 
            placeholder="https://www.institucion.pe"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descripción <span className="text-destructive">*</span></Label>
        <Textarea 
          id="description" 
          placeholder="Descripción de la institución"
          rows={3}
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          required
        />
      </div>

      {/* Horarios de atención - Solo en edición */}
      {isEditing && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <Label className="text-base font-semibold">Horarios de Atención</Label>
          </div>
          <div className="space-y-3 border rounded-lg p-4">
            {Object.keys(dayLabels).map((day) => (
              <div 
                key={day} 
                className="transition-all duration-300 ease-in-out"
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-24 flex-shrink-0">
                    <span className="text-sm font-medium">{dayLabels[day]}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Checkbox
                      id={`${day}-closed`}
                      checked={formData.schedule[day].closed}
                      onCheckedChange={(checked) => handleDayClosedToggle(day, checked)}
                    />
                    <Label htmlFor={`${day}-closed`} className="text-sm whitespace-nowrap">
                      Cerrado
                    </Label>
                  </div>
                  {!formData.schedule[day].closed && (
                    <div className="flex items-center gap-4 flex-wrap animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Label htmlFor={`${day}-open`} className="text-sm whitespace-nowrap">Abre:</Label>
                        <Input
                          id={`${day}-open`}
                          type="time"
                          value={formData.schedule[day].open || ''}
                          onChange={(e) => handleScheduleChange(day, 'open', e.target.value)}
                          className="w-32 flex-shrink-0"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Label htmlFor={`${day}-close`} className="text-sm whitespace-nowrap">Cierra:</Label>
                        <Input
                          id={`${day}-close`}
                          type="time"
                          value={formData.schedule[day].close || ''}
                          onChange={(e) => handleScheduleChange(day, 'close', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Upload Section - Solo en edición */}
      {isEditing && (
        <div>
          <Label>Imagen de la institución</Label>
          <div className="mt-2">
            <ImageUpload
              currentImageUrl={formData.imageUrl}
              onUploadComplete={handleImageUpload}
              onUploadError={handleImageUploadError}
              disabled={isSubmitting}
              monumentId={institution?._id}
              entityType="institutions"
            />
          </div>
          {!formData.imageUrl && (
            <p className="text-sm text-muted-foreground mt-2">
              Agrega una imagen para poder hacer la institución disponible
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
            isEditing ? 'Actualizar Institución' : 'Crear Institución'
          )}
        </Button>
      </div>
    </div>
  );
}

InstitutionForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  institution: PropTypes.object,
  onSave: PropTypes.func.isRequired,
};

export default InstitutionsManager;

/**
 * Gestor de Culturas
 *
 * Permite listar, filtrar y administrar culturas.
 */
import { useEffect, useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import apiService from '../services/api';
import PropTypes from 'prop-types';

function CulturesManager() {
  const [cultures, setCultures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCultures, setTotalCultures] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const pageSize = 10;
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCulture, setEditingCulture] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchTerm(searchTerm);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    loadData();
  }, [currentPage, debouncedSearchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [data, statsData] = await Promise.all([
        apiService.getCultures({ page: currentPage, limit: pageSize, search: debouncedSearchTerm.trim() || undefined }),
        apiService.getCultureStats()
      ]);

      setCultures(data.items || data || []);
      setTotalCultures(data.total || 0);
      setStats({
        total: statsData.total || 0,
        active: statsData.active || 0,
      });
    } catch (error) {
      console.error('Error loading cultures:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCultures = cultures;

  const totalPages = Math.max(1, Math.ceil(totalCultures / pageSize));

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta cultura?')) return;

    try {
      await apiService.deleteCulture(id);
      setCultures(prev => prev.filter(culture => culture._id !== id));
    } catch (error) {
      console.error('Error deleting culture:', error);
      alert('Error al eliminar la cultura: ' + error.message);
    }
  };

  const handleEdit = (culture) => {
    setEditingCulture(culture);
    setIsEditDialogOpen(true);
  };

  const handleCloseEdit = () => {
    setEditingCulture(null);
    setIsEditDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Gestión de Culturas</h1>
          <p className="text-muted-foreground">
            Administra las culturas asociadas a los monumentos
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Cultura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Nueva Cultura</DialogTitle>
              <DialogDescription>
                Añade una nueva cultura para clasificar monumentos
              </DialogDescription>
            </DialogHeader>
            <CultureForm
              onClose={() => setIsCreateDialogOpen(false)}
              onSave={loadData}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Cultura</DialogTitle>
              <DialogDescription>
                Modifica la información de la cultura seleccionada
              </DialogDescription>
            </DialogHeader>
            <CultureForm
              culture={editingCulture}
              onClose={handleCloseEdit}
              onSave={loadData}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar culturas por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Total Culturas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Culturas Activas</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Culturas</CardTitle>
          <CardDescription>
            Página {currentPage} de {totalPages} • {totalCultures} culturas en total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cultura</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    <p className="mt-2 text-muted-foreground">Cargando culturas...</p>
                  </TableCell>
                </TableRow>
              ) : filteredCultures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <p className="text-muted-foreground">No se encontraron culturas</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCultures.map((culture) => (
                  <TableRow key={culture._id}>
                    <TableCell>
                      <p className="font-medium">{culture.name}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">
                        {culture.description || 'Sin descripción'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={culture.isActive ? 'default' : 'secondary'}>
                        {culture.isActive ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(culture)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(culture._id)}
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
              Mostrando {filteredCultures.length} de {totalCultures}
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

function CultureForm({ onClose, culture = null, onSave }) {
  const [formData, setFormData] = useState({
    name: culture?.name || '',
    description: culture?.description || '',
    isActive: culture?.isActive ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('La cultura es obligatoria');
      return;
    }

    setIsSubmitting(true);

    try {
      if (culture) {
        await apiService.updateCulture(culture._id, formData);
      } else {
        await apiService.createCulture(formData);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving culture:', error);
      alert('Error al guardar la cultura: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(culture);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Cultura</Label>
        <Input
          id="name"
          placeholder="Nombre de la cultura"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          placeholder="Descripción de la cultura"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="isActive">Estado</Label>
        <Select
          value={formData.isActive.toString()}
          onValueChange={(value) => handleInputChange('isActive', value === 'true')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Activa</SelectItem>
            <SelectItem value="false">Inactiva</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
            isEditing ? 'Actualizar Cultura' : 'Crear Cultura'
          )}
        </Button>
      </div>
    </div>
  );
}

CultureForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  culture: PropTypes.object,
  onSave: PropTypes.func.isRequired,
};

export default CulturesManager;
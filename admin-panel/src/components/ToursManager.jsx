/**
 * Componente ToursManager
 * 
 * Gestiona recorridos turísticos organizados por institución.
 * Flujo: Lista de instituciones → Vista detallada con tours → Formulario de creación
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  AlertCircle,
  CheckCircle,
  MapPin,
  Clock,
  ArrowLeft,
  Building,
  Phone,
  Mail,
  Globe,
  ChevronLeft,
  ChevronRight,
  Route
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import apiService from '../services/api';
import TourForm from './TourForm';

const TOUR_TYPES = [
  'Cronológico',
  'Temático',
  'Rápido'
];

function ToursManager() {
  const { tourId } = useParams();
  const queryClient = useQueryClient();
  
  const [view, setView] = useState(tourId ? 'form' : 'institutions'); // 'institutions', 'tours', 'form'
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [tours, setTours] = useState([]);
  const [monuments, setMonuments] = useState([]);
  const [editingTour, setEditingTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInstitutions, setTotalInstitutions] = useState(0);
  const [tourCounts, setTourCounts] = useState({});
  const pageSize = 9;

  useEffect(() => {
    loadInstitutions();
  }, [currentPage]);

  const loadInstitutions = async () => {
    try {
      setLoading(true);
      // Solo cargar instituciones disponibles
      const institutionsData = await apiService.getInstitutions({
        availableOnly: true,
        page: currentPage,
        limit: pageSize
      });
      const institutionsList = institutionsData.items || institutionsData || [];
      setInstitutions(institutionsList);
      setTotalInstitutions(institutionsData.total || institutionsList.length || 0);
      
      // Cargar conteo de tours para cada institución
      loadTourCounts(institutionsList);
    } catch (error) {
      console.error('Error loading institutions:', error);
      showNotification('error', 'Error al cargar instituciones');
    } finally {
      setLoading(false);
    }
  };

  const loadTourCounts = async (institutionsList) => {
    try {
      const counts = {};
      await Promise.all(
        institutionsList.map(async (inst) => {
          try {
            const data = await apiService.getToursByInstitution(inst._id, true);
            counts[inst._id] = data.items?.length || data.length || 0;
          } catch (err) {
            console.error(`Error loading tours for ${inst.name}:`, err);
            counts[inst._id] = 0;
          }
        })
      );
      setTourCounts(counts);
    } catch (error) {
      console.error('Error loading tour counts:', error);
    }
  };

  const loadToursForInstitution = async (institutionId) => {
    try {
      setLoading(true);
      const [toursData, monumentsData] = await Promise.all([
        apiService.getToursByInstitution(institutionId, true),
        apiService.getMonuments({ availableOnly: true }) // Solo monumentos disponibles
      ]);
      
      setTours(toursData.items || toursData);
      setMonuments(monumentsData.items || monumentsData);
    } catch (error) {
      console.error('Error loading tours:', error);
      showNotification('error', 'Error al cargar tours');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSelectInstitution = async (institution) => {
    setSelectedInstitution(institution);
    await loadToursForInstitution(institution._id);
    setView('tours');
  };

  const handleBackToInstitutions = () => {
    // IMPORTANTE: Invalidar caché de React Query cuando vuelve atrás
    queryClient.invalidateQueries({
      queryKey: ['tours'],
    });
    setView('institutions');
    setSelectedInstitution(null);
    setTours([]);
    setMonuments([]);
    loadInstitutions();
  };

  const handleBackToTours = () => {
    // IMPORTANTE: Invalidar caché de React Query cuando vuelve atrás
    queryClient.invalidateQueries({
      queryKey: ['tours'],
    });
    setView('tours');
    setEditingTour(null);
    loadToursForInstitution(selectedInstitution._id);
  };

  const handleCreateTour = () => {
    setEditingTour(null);
    setView('form');
  };

  const handleEditTour = (tour) => {
    setEditingTour(tour);
    setView('form');
  };

  const handleDeleteTour = async (tourId) => {
    if (!confirm('¿Eliminar este tour?')) return;
    
    try {
      await apiService.deleteTour(tourId);
      await loadToursForInstitution(selectedInstitution._id);
      showNotification('success', 'Tour eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting tour:', error);
      showNotification('error', 'Error al eliminar tour');
    }
  };

  const handleFormSave = async () => {
    await loadToursForInstitution(selectedInstitution._id);
    setView('tours');
    setEditingTour(null);
    showNotification('success', editingTour ? 'Tour actualizado' : 'Tour creado exitosamente');
  };

  if (loading && view === 'institutions') {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalInstitutions / pageSize));

  // Vista de formulario
  if (view === 'form') {
    return (
      <TourForm
        tour={editingTour}
        institutions={institutions}
        monuments={monuments}
        preselectedInstitutionId={selectedInstitution?._id}
        onClose={handleBackToTours}
        onSave={handleFormSave}
        allowedTourTypes={TOUR_TYPES}
      />
    );
  }

  // Vista de tours de una institución
  if (view === 'tours' && selectedInstitution) {
    return (
      <div className="p-6 space-y-6">
        {/* Header con botón de regreso */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBackToInstitutions}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a instituciones
          </Button>
        </div>

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

        {/* Información de la institución */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              {selectedInstitution.imageUrl && (
                <ImageWithFallback
                  src={selectedInstitution.imageUrl}
                  alt={selectedInstitution.name}
                  className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{selectedInstitution.name}</CardTitle>
                <CardDescription className="text-base mb-3">
                  {selectedInstitution.description}
                </CardDescription>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedInstitution.location?.district && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedInstitution.location.district}</span>
                    </div>
                  )}
                  {selectedInstitution.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedInstitution.phone}</span>
                    </div>
                  )}
                  {selectedInstitution.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedInstitution.contactEmail}</span>
                    </div>
                  )}
                  {selectedInstitution.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <a 
                        href={selectedInstitution.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Sitio web
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Header de tours con botón agregar */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recorridos de {selectedInstitution.name}</h2>
          <Button onClick={handleCreateTour}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Tour
          </Button>
        </div>

        {/* Lista de tours */}
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tours.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No hay tours para esta institución. Crea el primero haciendo clic en "Agregar Tour"
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tours.map(tour => (
              <Card key={tour._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{tour.name}</h3>
                        <Badge variant={tour.isActive ? 'default' : 'secondary'}>
                          {tour.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                        <Badge variant="outline">{tour.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {tour.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {tour.estimatedDuration} min
                        </span>
                        <span>
                          {tour.monuments?.length || 0} monumentos
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTour(tour)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTour(tour._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Vista principal: Lista de instituciones
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Gestión de Recorridos</h1>
        <p className="text-muted-foreground">
          Selecciona una institución para ver y gestionar sus recorridos
        </p>
      </div>

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

      {/* Lista de instituciones */}
      {institutions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No hay instituciones disponibles. Las instituciones deben tener estado "Disponible" para aparecer aquí.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {institutions.map(institution => (
              <Card 
                key={institution._id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleSelectInstitution(institution)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {institution.imageUrl ? (
                      <ImageWithFallback
                        src={institution.imageUrl}
                        alt={institution.name}
                        className="w-full h-40 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-full h-40 bg-muted rounded-lg flex items-center justify-center">
                        <Building className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold line-clamp-1">{institution.name}</h3>
                      {institution.location?.district && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {institution.location.district}
                        </p>
                      )}
                    </div>
                    {institution.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {institution.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Route className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {tourCounts[institution._id] || 0} {tourCounts[institution._id] === 1 ? 'recorrido' : 'recorridos'}
                        </span>
                      </div>
                      {(!tourCounts[institution._id] || tourCounts[institution._id] === 0) && (
                        <Badge variant="secondary">Sin recorridos</Badge>
                      )}
                      {tourCounts[institution._id] > 0 && (
                        <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Configurado</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages} • {totalInstitutions} instituciones en total
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
        </div>
      )}
    </div>
  );
}

export default ToursManager;

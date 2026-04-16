/**
 * Componente QuizzesManager
 * 
 * Gestiona quizzes de monumentos con dos vistas:
 * 1. Monument List View: Lista de monumentos con contador de quizzes
 * 2. Quiz Editor View: Gestión de quizzes de un monumento específico
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import {
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Search,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import QuizEditor from './QuizEditor';
import apiService from '../services/api';
import PropTypes from 'prop-types';

function QuizzesManager() {
  const { monumentId } = useParams();
  const navigate = useNavigate();
  
  // View state management - determined by URL params
  const [view, setView] = useState(monumentId ? 'editor' : 'list');
  const [selectedMonument, setSelectedMonument] = useState(null);
  
  // Monument list state
  const [monuments, setMonuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMonuments, setTotalMonuments] = useState(0);
  const pageSize = 9;
  const [notification, setNotification] = useState(null);
  
  // Quiz counts
  const [quizCounts, setQuizCounts] = useState({});

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchTerm(searchTerm);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    if (!monumentId) {
      loadMonuments();
    }
  }, [currentPage, debouncedSearchTerm]);

  // Load monument when monumentId changes
  useEffect(() => {
    if (monumentId) {
      const loadMonumentData = async () => {
        try {
          setLoading(true);
          const monument = await apiService.getMonument(monumentId);
          
          if (monument) {
            setSelectedMonument(monument);
            setView('editor');
          } else {
            showNotification('error', 'Monumento no encontrado');
            navigate('/quizzes');
          }
        } catch (error) {
          console.error('Error loading monument:', error);
          showNotification('error', 'Error al cargar monumento');
          navigate('/quizzes');
        } finally {
          setLoading(false);
        }
      };
      
      loadMonumentData();
    } else {
      setView('list');
      setSelectedMonument(null);
    }
  }, [monumentId]);

  // Load monuments
  const loadMonuments = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMonuments({
        page: currentPage,
        limit: pageSize,
        text: debouncedSearchTerm.trim() || undefined
      });
      const monumentsList = response.items || response || [];
      
      setMonuments(monumentsList);
      setTotalMonuments(response.total || 0);
      
      // Load quiz counts for each monument
      await loadQuizCounts(monumentsList);
    } catch (error) {
      console.error('Error loading monuments:', error);
      showNotification('error', 'Error al cargar monumentos');
    } finally {
      setLoading(false);
    }
  };

  // Load quiz counts
  const loadQuizCounts = async (monumentsList) => {
    try {
      const counts = {};
      
      // Load counts for all monuments in parallel
      await Promise.all(
        monumentsList.map(async (monument) => {
          try {
            const data = await apiService.getQuizzes({ monumentId: monument._id });
            counts[monument._id] = data.items?.length || 0;
          } catch (error) {
            console.error(`Error loading count for ${monument.name}:`, error);
            counts[monument._id] = 0;
          }
        })
      );
      
      setQuizCounts(counts);
    } catch (error) {
      console.error('Error loading quiz counts:', error);
    }
  };

  // Filter monuments based on search term
  const filteredMonuments = monuments;
  const totalPages = Math.max(1, Math.ceil(totalMonuments / pageSize));

  // Handle monument selection
  const handleMonumentClick = (monument) => {
    navigate(`/quizzes/monument/${monument._id}`);
  };

  // Navigate back to monument list
  const handleBackToList = () => {
    navigate('/quizzes');
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Render Monument List View
  if (view === 'list') {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Quizzes de Monumentos</h1>
          <p className="text-muted-foreground">
            Gestiona los quizzes educativos de cada monumento
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
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
                Monumentos ({filteredMonuments.length})
            </h2>
            
            {filteredMonuments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {searchTerm ? 'No se encontraron monumentos' : 'No hay monumentos disponibles'}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredMonuments.map((monument) => (
                  <MonumentCard
                    key={monument._id}
                    monument={monument}
                    quizCount={quizCounts[monument._id] || 0}
                    onClick={() => handleMonumentClick(monument)}
                  />
                ))}
              </div>
            )}
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages} • {totalMonuments} monumentos en total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={loading || currentPage <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={loading || currentPage >= totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Quiz Editor View
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

      {/* Quiz Editor */}
      <QuizEditor
        monumentId={selectedMonument?._id}
        monumentName={selectedMonument?.name}
      />
    </div>
  );
}

// Monument Card Component
function MonumentCard({ monument, quizCount, onClick }) {
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
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {quizCount} {quizCount === 1 ? 'quiz' : 'quizzes'}
              </span>
            </div>
            {quizCount === 0 && (
              <Badge variant="secondary">Sin quizzes</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

MonumentCard.propTypes = {
  monument: PropTypes.object.isRequired,
  quizCount: PropTypes.number.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default QuizzesManager;

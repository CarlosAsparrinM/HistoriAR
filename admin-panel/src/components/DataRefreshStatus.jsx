import { RefreshCw, Check } from 'lucide-react';
import { Button } from './ui/button';

/**
 * Componente DataRefreshStatus - Muestra estado de actualización y timestamp
 */
export default function DataRefreshStatus({ 
  lastRefresh, 
  isRefreshing, 
  onManualRefresh,
  isAutoEnabled = true,
  onToggleAuto
}) {
  
  // Calcular tiempo desde última actualización
  const getTimeAgoText = () => {
    if (!lastRefresh) return 'Nunca';
    
    const now = Date.now();
    const diffMs = now - lastRefresh;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffSeconds < 60) {
      return 'Hace unos segundos';
    } else if (diffMinutes < 60) {
      return `Hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    } else {
      return new Date(lastRefresh).toLocaleDateString('es-PE', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border text-sm">
      {/* Indicador de estado */}
      <div className="flex items-center gap-2">
        {isRefreshing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-muted-foreground">Actualizando...</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-muted-foreground">
              Última actualización: {getTimeAgoText()}
            </span>
          </>
        )}
      </div>

      {/* Botones de control */}
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onManualRefresh}
          disabled={isRefreshing}
          className="gap-1"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>

        <Button
          variant={isAutoEnabled ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleAuto}
          className="text-xs"
        >
          {isAutoEnabled ? '⏸ Auto ON' : '▶ Auto OFF'}
        </Button>
      </div>
    </div>
  );
}

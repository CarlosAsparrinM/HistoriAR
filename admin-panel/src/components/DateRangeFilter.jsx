import { useState } from 'react';
import { Button } from './ui/button';
import { Calendar } from 'lucide-react';
import { Input } from './ui/input';

/**
 * Componente DateRangeFilter - Selector de rango de fechas para el dashboard
 * Incluye opciones rápidas (Hoy, Últimos 7 días, etc.) y selector personalizado
 */
export default function DateRangeFilter({ onDateRangeChange, initialRange = 'week' }) {
  const [selectedRange, setSelectedRange] = useState(initialRange);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const presetOptions = [
    { id: 'yesterday', label: 'Ayer', emoji: '📅' },
    { id: 'week', label: 'Hace una semana', emoji: '📊' },
    { id: 'month', label: 'Hace un mes', emoji: '📈' },
    { id: '3months', label: 'Hace 3 meses', emoji: '📉' },
    { id: 'year', label: 'Hace un año', emoji: '📆' },
    { id: 'custom', label: 'Personalizado', emoji: '🔧' },
  ];

  const handlePresetClick = (rangeId) => {
    setSelectedRange(rangeId);
    if (rangeId === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onDateRangeChange(rangeId);
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      
      if (startDate <= endDate) {
        onDateRangeChange({
          startDate,
          endDate,
        });
        setShowCustom(false);
        setSelectedRange('custom');
      } else {
        alert('La fecha de inicio debe ser anterior a la fecha de fin');
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Opciones rápidas */}
      <div className="flex flex-wrap gap-2">
        {presetOptions.map(option => (
          <Button
            key={option.id}
            variant={selectedRange === option.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetClick(option.id)}
            className="gap-1"
          >
            <span>{option.emoji}</span>
            <span>{option.label}</span>
          </Button>
        ))}
      </div>

      {/* Selector personalizado */}
      {showCustom && (
        <div className="bg-muted p-4 rounded-lg space-y-3 border">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="font-medium text-sm">Rango personalizado</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Fecha inicio
              </label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Fecha fin
              </label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCustom(false);
                setCustomStartDate('');
                setCustomEndDate('');
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCustomDateApply}
            >
              Aplicar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

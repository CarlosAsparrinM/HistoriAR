/**
 * Dashboard Principal - Panel de Control Administrativo de HistoriAR
 * 
 * Este componente muestra un resumen de las métricas solicitadas:
 * Usuarios totales, visitas totales, sesiones AR y tiempo promedio de sesión.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import DateRangeFilter from "./DateRangeFilter";
import { KPISkeleton } from "./LoadingSkeletons";
import dashboardService from "../services/dashboardService";
import alertsService from "../services/alertsService";

// Importación de iconos de Lucide React
import { 
  Users,          // Icono para usuarios
  Eye,            // Icono para visitas
  Camera,         // Icono para sesiones AR
  Clock,          // Icono para tiempo
  RefreshCcw,     // Icono para recargar
  AlertTriangle,  // Icono para alertas
  AlertCircle,    // Icono para critico
  Info as InfoIcon, // Icono para info
  ArrowRight      // Icono para acción
} from "lucide-react";

function KpiCard({ title, value, icon: Icon, description, loading }) {
  if (loading) return <KPISkeleton />;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [integrityAlerts, setIntegrityAlerts] = useState([]);
  const [dateRange, setDateRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await dashboardService.getDashboardStats(dateRange);
      setData(stats);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const loadIntegrityAlerts = useCallback(async () => {
    try {
      setAlertsLoading(true);
      const response = await alertsService.getDataIntegrityAlerts();
      setIntegrityAlerts(response.data || []);
    } catch (err) {
      console.error('Error loading integrity alerts:', err);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    loadIntegrityAlerts();
  }, [loadIntegrityAlerts]);

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
  };

  const handleRefreshAll = () => {
    loadDashboardData();
    loadIntegrityAlerts();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panel de Control</h1>
          <p className="text-muted-foreground">
            Estadísticas consolidadas hasta ayer - {(() => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              return yesterday.toLocaleDateString('es-PE', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              });
            })()}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefreshAll}
          disabled={loading || alertsLoading}
        >
          <RefreshCcw className={`w-4 h-4 mr-2 ${(loading || alertsLoading) ? 'animate-spin' : ''}`} />
          Recargar
        </Button>
      </div>

      <Card className="p-4 bg-muted/50">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Filtrar periodo</h2>
          <DateRangeFilter 
            onDateRangeChange={handleDateRangeChange} 
            initialRange="week"
          />
          <p className="text-xs text-muted-foreground italic mt-2">
            * Nota: Los datos mostrados corresponden a cierres diarios. No se incluye el día de hoy por procesamiento de datos.
          </p>
        </div>
      </Card>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Usuarios Totales"
          value={data?.metrics?.totalUsers?.toLocaleString() || '0'}
          icon={Users}
          description="Acumulado hasta el fin del periodo"
          loading={loading}
        />
        <KpiCard
          title="Visitas Totales"
          value={data?.metrics?.totalVisits?.toLocaleString() || '0'}
          icon={Eye}
          description="En el periodo seleccionado"
          loading={loading}
        />
        <KpiCard
          title="Sesiones AR"
          value={data?.metrics?.arSessions?.toLocaleString() || '0'}
          icon={Camera}
          description="Uso de realidad aumentada"
          loading={loading}
        />
        <KpiCard
          title="Tiempo Promedio"
          value={`${data?.metrics?.avgSessionTime || 0} min`}
          icon={Clock}
          description="Duración media de sesión"
          loading={loading}
        />
      </div>

      <div className="grid gap-6">
        {/* Alertas de Integridad */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Tareas Pendientes</CardTitle>
                <CardDescription>Problemas detectados en la calidad de los datos</CardDescription>
              </div>
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {alertsLoading ? (
              <div className="space-y-3">
                <div className="h-20 bg-muted animate-pulse rounded-lg" />
                <div className="h-20 bg-muted animate-pulse rounded-lg" />
              </div>
            ) : integrityAlerts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground italic">
                No hay tareas pendientes. ¡Buen trabajo!
              </div>
            ) : (
              integrityAlerts.map((alert, index) => {
                const severityConfig = {
                  critical: {
                    border: 'border-l-red-500',
                    badge: 'destructive',
                    icon: <AlertCircle className="w-4 h-4 text-red-500" />,
                    label: 'Crítico'
                  },
                  warning: {
                    border: 'border-l-yellow-500',
                    badge: 'default', // Cambiado de warning si no existe
                    icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
                    label: 'Advertencia'
                  },
                  info: {
                    border: 'border-l-blue-500',
                    badge: 'secondary',
                    icon: <InfoIcon className="w-4 h-4 text-blue-500" />,
                    label: 'Sugerencia'
                  }
                }[alert.severity] || {
                  border: 'border-l-slate-500',
                  badge: 'outline',
                  icon: <InfoIcon className="w-4 h-4 text-slate-500" />,
                  label: 'Nota'
                };

                return (
                  <Card 
                    key={index} 
                    className={`border-l-4 ${severityConfig.border} hover:bg-muted/50 transition-colors cursor-pointer`} 
                    onClick={() => navigate(alert.actionUrl)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {severityConfig.icon}
                          <span className="font-semibold text-sm">{alert.title}</span>
                          <Badge variant={severityConfig.badge} className="text-[10px] h-4 px-1">
                            {severityConfig.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;

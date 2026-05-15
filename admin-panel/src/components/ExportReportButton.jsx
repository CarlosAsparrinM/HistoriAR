import { useState } from 'react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { Download, FileJson, FileText, Table } from 'lucide-react';
import exportService from '../services/exportService';

/**
 * Componente ExportReportButton - Exporta el reporte en múltiples formatos
 */
export default function ExportReportButton({ 
  stats, 
  monthlyData, 
  topMonuments, 
  deviceDistribution, 
  districtData,
  dateRange,
  isLoading = false 
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format) => {
    try {
      setIsExporting(true);

      // Generar reporte
      const report = exportService.generateDashboardReport(
        stats,
        monthlyData,
        topMonuments,
        deviceDistribution,
        districtData,
        dateRange
      );

      // Exportar según formato
      const filename = exportService.generateReportFilename(format);
      
      switch (format) {
        case 'csv':
          // Convertir a array plano para CSV
          const csvData = [
            { tipo: 'Resumen', valor: '' },
            { tipo: 'Usuarios Activos', valor: report.summary.totalUsers },
            { tipo: 'Visitas Totales', valor: report.summary.totalVisits },
            { tipo: 'Sesiones AR', valor: report.summary.arSessions },
            { tipo: 'Retención', valor: report.summary.retentionRate },
            { tipo: '', valor: '' },
            { tipo: 'Monumentos Top', valor: '' },
            ...report.topMonuments.map(m => ({
              tipo: m.name,
              valor: `${m.visitas} visitas (+${m.crecimiento}%)`
            })),
            { tipo: '', valor: '' },
            { tipo: 'Distritos', valor: '' },
            ...report.districtActivity.map(d => ({
              tipo: d.name,
              valor: `${d.visitas} visitas`
            })),
          ];
          exportService.exportToCSV(csvData, filename);
          break;
        case 'json':
          exportService.exportToJSON(report, filename.replace('.csv', '.json'));
          break;
        case 'xlsx':
          // Por ahora similar a CSV
          exportService.exportToExcel(
            report.topMonuments.map(m => ({
              Monumento: m.name,
              Visitas: m.visitas,
              Crecimiento: `${m.crecimiento}%`
            })),
            filename
          );
          break;
        default:
          console.error('Formato no soportado:', format);
      }

      // Mostrar notificación de éxito
      console.log(`Reporte exportado: ${filename}`);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar el reporte');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2"
          disabled={isLoading || isExporting}
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Exportando...' : 'Exportar Reporte'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4" />
          <span>Exportar como CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')} className="gap-2 cursor-pointer">
          <FileJson className="w-4 h-4" />
          <span>Exportar como JSON</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport('xlsx')} className="gap-2 cursor-pointer">
          <Table className="w-4 h-4" />
          <span>Exportar como Excel</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

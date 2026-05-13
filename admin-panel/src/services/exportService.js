/**
 * Servicio de Exportación de Reportes
 * Soporta PDF, Excel y CSV
 */

/**
 * Exporta datos a CSV
 */
export function exportToCSV(data, filename = 'reporte.csv') {
  const headers = Object.keys(data[0] || {});
  
  // Crear CSV
  let csv = headers.join(',') + '\n';
  data.forEach(row => {
    csv += headers.map(header => {
      const value = row[header];
      // Escapar comillas en strings
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',') + '\n';
  });

  // Descargar
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, filename);
}

/**
 * Exporta datos a Excel (simulado, usa CSV format)
 * Para Excel real se necesitaría una librería como xlsx
 */
export function exportToExcel(data, filename = 'reporte.xlsx') {
  // Por ahora exportar como CSV con extensión .xlsx
  // En producción usar librería xlsx
  exportToCSV(data, filename.replace('.xlsx', '.csv'));
}

/**
 * Exporta datos a JSON
 */
export function exportToJSON(data, filename = 'reporte.json') {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  downloadFile(blob, filename);
}

/**
 * Genera reporte completo del dashboard
 */
export function generateDashboardReport(stats, monthlyData, topMonuments, deviceDist, districtData, dateRange) {
  const now = new Date();
  
  const report = {
    metadata: {
      generatedAt: now.toISOString(),
      dateRange: {
        start: dateRange.startDate?.toLocaleDateString('es-PE'),
        end: dateRange.endDate?.toLocaleDateString('es-PE'),
      },
      generatedBy: 'HistoriAR Admin Dashboard',
    },
    summary: {
      totalUsers: stats?.totalUsers || 0,
      totalVisits: stats?.totalVisits || 0,
      arSessions: stats?.arSessions || 0,
      retentionRate: `${stats?.retentionRate || 0}%`,
    },
    monthlyTrends: monthlyData || [],
    topMonuments: topMonuments || [],
    deviceDistribution: deviceDist || [],
    districtActivity: districtData || [],
  };

  return report;
}

/**
 * Descarga un archivo blob
 */
function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Genera nombre de archivo con timestamp
 */
export function generateReportFilename(format = 'csv') {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 10);
  return `reporte-dashboard-${timestamp}.${format}`;
}

export const exportService = {
  exportToCSV,
  exportToExcel,
  exportToJSON,
  generateDashboardReport,
  generateReportFilename,
};

export default exportService;

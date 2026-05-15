import React, { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { AlertCircle, AlertTriangle, Info, X, CheckCircle2, Bell } from 'lucide-react';
import alertsService from '../services/alertsService';
import '../styles/alerts.css';

const AlertsPanel = ({ isOpen, onClose, onUnreadChange }) => {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({ total: 0, unread: 0, critical: 0, warnings: 0 });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('unread'); // 'all', 'unread', 'critical'

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
      loadSummary();
    }
  }, [isOpen, filter]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const filterParams = {
        limit: 50,
        offset: 0
      };

      if (filter === 'unread') {
        filterParams.read = false;
      } else if (filter === 'critical') {
        filterParams.severity = 'critical';
      }

      const data = await alertsService.getAllAlerts(
        filterParams.limit,
        filterParams.offset,
        filter === 'unread' ? false : null,
        filter === 'critical' ? 'critical' : null
      );
      setAlerts(data.data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await alertsService.getAlertsSummary();
      setSummary(data);
      onUnreadChange?.(data.unread);
    } catch (error) {
      console.error('Error loading alerts summary:', error);
    }
  };

  const handleMarkAsRead = async (id, isRead) => {
    try {
      if (isRead) {
        await alertsService.markAsUnread(id);
      } else {
        await alertsService.markAsRead(id);
      }
      loadAlerts();
      loadSummary();
    } catch (error) {
      console.error('Error updating alert:', error);
    }
  };

  const handleDismiss = async (id) => {
    try {
      await alertsService.dismissAlert(id);
      loadAlerts();
      loadSummary();
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await alertsService.markAllAsRead();
      loadAlerts();
      loadSummary();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="alerts-panel-overlay" onClick={onClose}>
      <Card className="alerts-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Alertas</h2>
            {summary.unread > 0 && (
              <Badge variant="destructive">{summary.unread}</Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2 border-b p-4 bg-gray-50">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700">{summary.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.unread}</div>
            <div className="text-xs text-gray-600">No leídas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{summary.critical}</div>
            <div className="text-xs text-gray-600">Críticas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary.warnings}</div>
            <div className="text-xs text-gray-600">Advertencias</div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 border-b p-4">
          <Button
            size="sm"
            variant={filter === 'unread' ? 'default' : 'outline'}
            onClick={() => setFilter('unread')}
          >
            No leídas
          </Button>
          <Button
            size="sm"
            variant={filter === 'critical' ? 'default' : 'outline'}
            onClick={() => setFilter('critical')}
          >
            Críticas
          </Button>
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Todas
          </Button>
          {summary.unread > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleMarkAllAsRead}
              className="ml-auto"
            >
              Marcar todas como leídas
            </Button>
          )}
        </div>

        {/* Alerts List */}
        <div className="alerts-list overflow-y-auto" style={{ maxHeight: '400px' }}>
          {loading ? (
            <div className="p-4 text-center text-gray-500">Cargando alertas...</div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
              <p>No hay alertas {filter !== 'all' ? 'por mostrar' : ''}</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert._id}
                className={`border-b p-4 transition hover:bg-gray-50 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex gap-3">
                  <div className="mt-1">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                        <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                        {alert.data && (
                          <div className="text-xs text-gray-600 mt-2">
                            {typeof alert.data === 'object' && (
                              <pre className="bg-gray-100 p-2 rounded overflow-auto max-w-xs">
                                {JSON.stringify(alert.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMarkAsRead(alert._id, alert.read)}
                          className="p-1 hover:bg-gray-200 rounded transition"
                          title={alert.read ? 'Marcar como no leída' : 'Marcar como leída'}
                        >
                          {alert.read ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-gray-400 rounded-full" />
                          )}
                        </button>
                        {alert.dismissible && (
                          <button
                            onClick={() => handleDismiss(alert._id)}
                            className="p-1 hover:bg-gray-200 rounded transition"
                            title="Descartar"
                          >
                            <X className="w-4 h-4 text-gray-600" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {alert.type}
                      </Badge>
                      {alert.action && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-6"
                          onClick={() => window.location.href = alert.actionUrl}
                        >
                          {alert.action}
                        </Button>
                      )}
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default AlertsPanel;

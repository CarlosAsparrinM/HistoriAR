'use client';

import { useEffect, useState } from 'react';
import { Clock, RefreshCw, WifiOff, X } from 'lucide-react';

const STORAGE_KEY = 'historiar-service-notice-dismissed';

export function isOutsideOperatingHours(): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Lima',
      hour: 'numeric',
      hour12: false,
    });
    const hour = Number.parseInt(formatter.format(new Date()), 10);
    // Operativo de 10:00 a 22:00 (10:00 AM a 10:00 PM hora de Perú)
    return hour < 10 || hour >= 22;
  } catch {
    return false;
  }
}

export function ServiceStatusNotice() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [reason, setReason] = useState<'offline' | 'schedule' | null>(null);

  useEffect(() => {
    // 1. Escuchar eventos de fallo de comunicación con el backend
    const handleBackendError = () => {
      setReason('offline');
      setIsOpen(true);
    };

    window.addEventListener('historiar:backend-error', handleBackendError);

    // 2. Comprobar si actualmente se encuentra fuera de horario de operación
    const checkSchedule = () => {
      if (isOutsideOperatingHours()) {
        try {
          const dismissedDate = window.sessionStorage.getItem(STORAGE_KEY);
          const currentHour = new Date().getHours();
          if (dismissedDate !== String(currentHour)) {
            setReason('schedule');
            setIsOpen(true);
          }
        } catch {
          setReason('schedule');
          setIsOpen(true);
        }
      }
    };

    checkSchedule();

    return () => {
      window.removeEventListener('historiar:backend-error', handleBackendError);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, String(new Date().getHours()));
    } catch {
      // Ignorar errores de almacenamiento local
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
      const normalized = apiBase.replace(/\/+$/, '');
      const response = await fetch(`${normalized}/health`, { cache: 'no-store' });
      if (response.ok) {
        setIsOpen(false);
        window.location.reload();
        return;
      }
    } catch {
      // Sigue sin respuesta
    } finally {
      setIsRetrying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="service-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-modal-title"
    >
      <div className="service-modal-card">
        <button
          type="button"
          className="service-modal-close-icon"
          onClick={handleClose}
          aria-label="Cerrar aviso"
        >
          <X size={20} />
        </button>

        <div className="service-modal-icon-badge">
          {reason === 'offline' ? <WifiOff size={30} /> : <Clock size={30} />}
        </div>

        <h2 id="service-modal-title">
          {reason === 'offline' ? 'Servicio no disponible' : 'Aviso de Horario de Atención'}
        </h2>

        <p>
          {reason === 'offline'
            ? 'No pudimos establecer conexión con el servidor de HistoriAR en este momento.'
            : 'El catálogo y los servicios de HistoriAR cuentan con un horario de funcionamiento diario.'}
        </p>

        <div className="service-hours-badge">
          <Clock size={18} />
          <span>Operativo de 10:00 a.m. a 10:00 p.m. (Hora de Perú)</span>
        </div>

        <p className="service-modal-subtext">
          Fuera de este horario, el servidor puede permanecer en mantenimiento o suspensión temporal.
        </p>

        <div className="service-modal-actions">
          <button
            type="button"
            className="service-modal-btn-primary"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            <RefreshCw size={16} className={isRetrying ? 'spin' : ''} />
            {isRetrying ? 'Comprobando…' : 'Reintentar conexión'}
          </button>
          <button
            type="button"
            className="service-modal-btn-secondary"
            onClick={handleClose}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { Clock, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flutter-screen" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#1c0c06', padding: '16px' }}>
      <section className="service-modal-card" style={{ animation: 'none', margin: '0 auto' }}>
        <div className="service-modal-icon-badge">
          <Clock size={32} />
        </div>
        <h2>Servicio no disponible</h2>
        <p>No se pudo conectar con el catálogo de HistoriAR en este momento.</p>
        <div className="service-hours-badge">
          <Clock size={18} />
          <span>Operativo de 10:00 a.m. a 10:00 p.m. (Hora de Perú)</span>
        </div>
        <p className="service-modal-subtext">
          Fuera de este horario, el servidor de la aplicación puede encontrarse en mantenimiento o suspensión temporal.
        </p>
        <div className="service-modal-actions">
          <button type="button" className="service-modal-btn-primary" onClick={reset}>
            <RefreshCw size={16} /> Reintentar
          </button>
          <Link href="/explorar" className="service-modal-btn-secondary">
            Ir al inicio
          </Link>
        </div>
      </section>
    </div>
  );
}


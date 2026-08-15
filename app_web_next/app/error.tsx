'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="error-state"><h1>No pudimos cargar HistoriAR</h1><p>Verifica tu conexión e inténtalo nuevamente.</p><button className="primary-button" onClick={reset}>Reintentar</button></section>;
}

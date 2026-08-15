'use client';

export default function MonumentError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="error-state"><h1>No pudimos cargar este monumento</h1><button className="primary-button" onClick={reset}>Reintentar</button></section>;
}

'use client';

import type { ElementType } from 'react';
import { useEffect, useState } from 'react';

const ModelViewerElement = 'model-viewer' as ElementType;

export function MonumentModelViewer({ src, name }: { src?: string; name: string }) {
  if (!src) return <p>Este monumento aún no tiene un modelo 3D público disponible.</p>;
  return <BrowserModelViewer src={src} name={name} />;
}

function BrowserModelViewer({ src, name }: { src: string; name: string }) {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void import('@google/model-viewer')
      .then(() => { if (isMounted) setIsReady(true); })
      .catch(() => { if (isMounted) setHasError(true); });
    return () => { isMounted = false; };
  }, []);

  if (hasError) return <p>No se pudo cargar el visor 3D en este navegador.</p>;
  if (!isReady) return <div className="model-viewer model-viewer-loading">Cargando visor 3D…</div>;
  return <ModelViewerElement className="model-viewer" src={src} alt={`Modelo 3D de ${name}`} auto-rotate camera-controls />;
}

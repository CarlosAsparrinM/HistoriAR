'use client';

import { useEffect, useRef } from 'react';

const AD_OPTIONS = {
  key: '5ac12ec9c1127531f0ef0fcdd4cb1d87',
  format: 'iframe',
  height: 600,
  width: 160,
  params: {},
};

const AD_SCRIPT_URL = 'https://www.highperformanceformat.com/5ac12ec9c1127531f0ef0fcdd4cb1d87/invoke.js';

export function BannerAd() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // The ad provider expects a global "atOptions" before loading invoke.js.
    const optionsScript = document.createElement('script');
    optionsScript.type = 'text/javascript';
    optionsScript.text = `atOptions = ${JSON.stringify(AD_OPTIONS)};`;

    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = AD_SCRIPT_URL;
    invokeScript.async = true;

    container.innerHTML = '';
    container.append(optionsScript, invokeScript);

    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <div ref={containerRef}>
      <noscript>
        <small>Activa JavaScript para cargar este anuncio.</small>
      </noscript>
    </div>
  );
}

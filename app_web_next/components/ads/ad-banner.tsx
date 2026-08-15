'use client';

import { useEffect, useRef } from 'react';

/**
 * Renders an Adsterra 160×600 banner via an iframe.
 * Each instance creates its own isolated iframe so ads render independently
 * on both sides without global-variable race conditions.
 */
export function AdBanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || loadedRef.current) return;
    loadedRef.current = true;

    // Create an isolated iframe so each ad instance gets its own global scope
    const iframe = document.createElement('iframe');
    iframe.style.width = '160px';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.scrolling = 'no';
    container.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html><head><style>body{margin:0;overflow:hidden;}</style></head>
        <body>
          <script>
            atOptions = {
              key: '5ac12ec9c1127531f0ef0fcdd4cb1d87',
              format: 'iframe',
              height: 600,
              width: 160,
              params: {}
            };
          </script>
          <script src="https://www.highperformanceformat.com/5ac12ec9c1127531f0ef0fcdd4cb1d87/invoke.js"></script>
        </body></html>
      `);
      iframeDoc.close();
    }
  }, []);

  return <div ref={containerRef} className="ad-banner-inner" />;
}

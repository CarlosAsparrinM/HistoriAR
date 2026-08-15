'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'historiar-beta-notice-last-seen';

function localDayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function BetaNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const today = localDayKey();

    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== today) {
        window.localStorage.setItem(STORAGE_KEY, today);
        setVisible(true);
      }
    } catch {
      // Si el navegador bloquea el almacenamiento, se muestra el aviso en esta visita.
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <aside className="beta-notice" role="dialog" aria-live="polite" aria-label="Aviso de versión beta">
      <div className="beta-notice-copy">
        <strong>HistoriAR está en versión beta</strong>
        <p>Los modelos 3D y otros elementos de la web son de prueba o aún no están completos.</p>
      </div>
      <button className="beta-notice-close" type="button" onClick={() => setVisible(false)} aria-label="Cerrar aviso">
        Entendido
      </button>
    </aside>
  );
}

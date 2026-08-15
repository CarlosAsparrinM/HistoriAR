import { ArrowLeft, Box, Landmark } from 'lucide-react';
import Link from 'next/link';

import { googlePlayUrl } from '@/lib/env';

export function AppHeader({ title = 'HistoriAR Web', backHref }: { title?: string; backHref?: string }) {
  return <header className="site-header">
    <div className="header-title">
      {backHref && <Link className="header-icon-button" href={backHref} aria-label="Volver"><ArrowLeft size={24} /></Link>}
      {!backHref && <Landmark size={24} aria-hidden />}
      <strong>{title}</strong>
    </div>
    {!title.startsWith('Quiz:') && <a className="header-link" href={googlePlayUrl} target="_blank" rel="noreferrer"><Box size={20} aria-hidden /> AR en móvil</a>}
  </header>;
}

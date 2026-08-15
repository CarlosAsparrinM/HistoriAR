import Link from 'next/link';

export function AppFooter() {
  return <footer className="site-footer"><strong>HistoriAR</strong><span>Patrimonio histórico y cultural del Perú</span><nav aria-label="Enlaces legales"><Link href="/legal/privacidad">Privacidad</Link><Link href="/legal/terminos">Términos</Link></nav><span>© 2026 HistoriAR</span></footer>;
}

import Link from 'next/link';

export default function NotFound() {
  return <section className="error-state"><h1>No encontramos este monumento</h1><p>Puede que no esté publicado o que el enlace haya cambiado.</p><Link className="primary-button" href="/explorar">Volver a explorar</Link></section>;
}

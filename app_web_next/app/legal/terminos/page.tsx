import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, FileText, ShieldCheck } from 'lucide-react';
import { AppFooter } from '@/components/layout/app-footer';
import { AppHeader } from '@/components/layout/app-header';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl, defaultOgImage, siteName, siteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Términos de uso',
  description: 'Términos y condiciones de uso de la plataforma cultural y educativa HistoriAR.',
  alternates: { canonical: '/legal/terminos' },
  openGraph: {
    title: `Términos de uso | ${siteName}`,
    description: 'Términos y condiciones de uso de la plataforma cultural y educativa HistoriAR.',
    url: '/legal/terminos',
    type: 'website',
    images: [defaultOgImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Términos de uso | ${siteName}`,
    description: 'Términos y condiciones de uso de la plataforma cultural y educativa HistoriAR.',
    images: [defaultOgImage.url],
  },
};

export default function TermsPage() {
  return (
    <div className="flutter-screen">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Términos de uso', item: absoluteUrl('/legal/terminos') },
        ],
      }} />

      <AppHeader title="HistoriAR Legal" backHref="/explorar" />

      <main className="legal-wrapper">
        <nav className="legal-nav-tabs" aria-label="Navegación legal">
          <Link href="/legal/privacidad" className="legal-tab">
            <ShieldCheck size={16} aria-hidden /> Política de privacidad
          </Link>
          <Link href="/legal/terminos" className="legal-tab active" aria-current="page">
            <FileText size={16} aria-hidden /> Términos de uso
          </Link>
        </nav>

        <article className="legal-card">
          <span className="legal-badge">
            <BookOpen size={13} aria-hidden /> Condiciones de Servicio
          </span>
          <h1>Términos de Uso</h1>
          <p className="updated-at">Última actualización: agosto de 2026</p>

          <p>
            Bienvenido a <strong>HistoriAR</strong>. Al acceder o utilizar nuestro sitio web, catálogo interactivo o la aplicación móvil de HistoriAR, aceptas quedar vinculado por los presentes Términos de Uso. Si no estás de acuerdo con alguno de los términos, te sugerimos abstenerte de utilizar la plataforma.
          </p>

          <div className="legal-highlight-box">
            <p>
              <strong>Propósito del proyecto:</strong> HistoriAR es una iniciativa tecnológica y educativa sin fines de lucro destinada a promover, documentar y revalorizar el patrimonio arqueológico, histórico y cultural del Perú a través de visualizaciones 3D y Realidad Aumentada (AR).
            </p>
          </div>

          <h2>1. Uso aceptable y fines educativos</h2>
          <p>
            El contenido provisto (fichas históricas, modelos 3D, cronologías y evaluaciones interactivas) está destinado al aprendizaje personal, académico y cultural. Te comprometes a no realizar ingeniería inversa, extracción masiva automatizada no autorizada (scraping abusivo) ni acciones que pongan en riesgo la disponibilidad de la infraestructura.
          </p>

          <h2>2. Experiencia de Realidad Aumentada (AR)</h2>
          <p>
            La funcionalidad de Realidad Aumentada requiere dispositivos móviles compatibles con sensores de movimiento y servicios de AR (como Google Play Services for AR / ARCore).
          </p>
          <ul>
            <li>
              <strong>Seguridad física en el entorno:</strong> Al utilizar la cámara y el visor AR, mantén siempre atención a tu entorno físico para prevenir accidentes, caídas o situaciones de riesgo. No uses la función AR mientras caminas cerca de tráfico vehicular o zonas peligrosas.
            </li>
          </ul>

          <h2>3. Propiedad intelectual y créditos de fuentes</h2>
          <p>
            Los modelos tridimensionales, marcas, diseños de interfaz y código fuente son propiedad del equipo de desarrollo de HistoriAR o se utilizan bajo licencias abiertas y acuerdos de atribución con museos y fuentes de investigación histórica del Perú.
          </p>
          <p>
            Los mapas interactivos se integran mediante OpenStreetMap y sus colaboradores, bajo licencia Open Database License (ODbL).
          </p>

          <h2>4. Disponibilidad del servicio y horarios de backend</h2>
          <p>
            HistoriAR se ofrece «tal cual» (as-is). Debido a la optimización de recursos y despliegues en servidores cloud, algunos servicios de backend o consultas en tiempo real pueden estar sujetos a horarios de atención y mantenimiento programado. No garantizamos un funcionamiento ininterrumpido o libre de errores en todo momento.
          </p>

          <h2>5. Enlaces externos y exactitud histórica</h2>
          <p>
            Hacemos esfuerzos constantes por validar la precisión de las reseñas históricas y arqueológicas. No obstante, HistoriAR no se responsabiliza por interpretaciones erróneas derivadas del uso del material didáctico o por el contenido de portales externos enlazados en las fichas culturales.
          </p>

          <h2>6. Modificaciones de los términos</h2>
          <p>
            Nos reservamos el derecho de actualizar estos términos periódicamente para reflejar mejoras técnicas, nuevas funciones en la aplicación móvil o requerimientos legales. Las modificaciones entrarán en vigencia inmediatamente tras su publicación en esta página.
          </p>

          <h2>7. Contacto</h2>
          <p>
            Para consultas relacionadas con estos Términos o solicitudes de colaboración institucional, puedes comunicarte con el equipo de HistoriAR mediante los repositorios y canales oficiales del proyecto.
          </p>
        </article>
      </main>

      <AppFooter />
    </div>
  );
}


import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Lock, ShieldCheck } from 'lucide-react';
import { AppFooter } from '@/components/layout/app-footer';
import { AppHeader } from '@/components/layout/app-header';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl, defaultOgImage, siteName, siteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Política de privacidad, protección de datos y uso de servicios de HistoriAR.',
  alternates: { canonical: '/legal/privacidad' },
  openGraph: {
    title: `Política de privacidad | ${siteName}`,
    description: 'Política de privacidad, protección de datos y uso de servicios de HistoriAR.',
    url: '/legal/privacidad',
    type: 'website',
    images: [defaultOgImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Política de privacidad | ${siteName}`,
    description: 'Política de privacidad, protección de datos y uso de servicios de HistoriAR.',
    images: [defaultOgImage.url],
  },
};

export default function PrivacyPage() {
  return (
    <div className="flutter-screen">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Política de privacidad', item: absoluteUrl('/legal/privacidad') },
        ],
      }} />

      <AppHeader title="HistoriAR Legal" backHref="/explorar" />

      <main className="legal-wrapper">
        <nav className="legal-nav-tabs" aria-label="Navegación legal">
          <Link href="/legal/privacidad" className="legal-tab active" aria-current="page">
            <ShieldCheck size={16} aria-hidden /> Política de privacidad
          </Link>
          <Link href="/legal/terminos" className="legal-tab">
            <FileText size={16} aria-hidden /> Términos de uso
          </Link>
        </nav>

        <article className="legal-card">
          <span className="legal-badge">
            <Lock size={13} aria-hidden /> Transparencia y Privacidad
          </span>
          <h1>Política de Privacidad</h1>
          <p className="updated-at">Última actualización: agosto de 2026</p>

          <p>
            En <strong>HistoriAR</strong>, accesible desde la plataforma web y nuestra aplicación móvil para Android, la privacidad de nuestros visitantes y usuarios es una prioridad fundamental. Este documento describe los tipos de información que recopilamos, cómo la utilizamos y las medidas adoptadas para protegerla.
          </p>

          <div className="legal-highlight-box">
            <p>
              <strong>Compromiso cultural y educativo:</strong> HistoriAR está orientado a la divulgación cultural y pedagógica del patrimonio histórico del Perú. El acceso al catálogo público, visor 3D, mapas interactivos y cuestionarios no requiere la creación obligatoria de una cuenta ni el suministro de datos sensibles.
            </p>
          </div>

          <h2>1. Información que recopilamos</h2>
          <p>Podemos recopilar y procesar la siguiente información dependiendo de cómo interactúas con la plataforma:</p>
          <ul>
            <li>
              <strong>Datos de navegación y diagnóstico técnico:</strong> Información general no identificable como dirección IP anonimizada, tipo de navegador, sistema operativo, páginas visitadas y tiempos de respuesta para garantizar la seguridad y estabilidad del servicio.
            </li>
            <li>
              <strong>Permisos en la aplicación móvil:</strong>
              <ul>
                <li><strong>Cámara:</strong> Utilizada exclusivamente en tiempo real para proyectar modelos tridimensionales en Realidad Aumentada (AR). No grabamos, almacenamos ni transmitimos imágenes de tu entorno a ningún servidor sin tu consentimiento.</li>
                <li><strong>Ubicación aproximada/precisa (GPS):</strong> Empleada únicamente para ubicar monumentos cercanos en el mapa y calcular distancias.</li>
              </ul>
            </li>
            <li>
              <strong>Participación en Quizzes y Evaluaciones:</strong> Respuestas anónimas procesadas de manera agregada para calcular puntajes y proteger la API contra abusos o ataques de denegación de servicio.
            </li>
          </ul>

          <h2>2. Finalidad del tratamiento de datos</h2>
          <p>Utilizamos la información recopilada para:</p>
          <ul>
            <li>Proveer, mantener y optimizar la experiencia interactiva de aprendizaje y visualización 3D.</li>
            <li>Detectar, prevenir y solucionar problemas técnicos o de seguridad en el backend.</li>
            <li>Analizar estadísticas de uso anónimas para identificar los monumentos y contenidos de mayor interés.</li>
          </ul>

          <h2>3. Servicios de terceros e infraestructura</h2>
          <p>HistoriAR se apoya en proveedores de tecnología confiables con altos estándares de seguridad:</p>
          <ul>
            <li><strong>Almacenamiento en la nube (AWS S3):</strong> Distribución segura de archivos multimedia, fotografías y modelos 3D (.glb).</li>
            <li><strong>Cartografía (OpenStreetMap / Leaflet):</strong> Carga de capas cartográficas para la localización de sitios arqueológicos y monumentos.</li>
            <li><strong>Analíticas web (Vercel Analytics):</strong> Medición de métricas de rendimiento y visitas sin rastreo invasivo ni almacenamiento de cookies personales.</li>
          </ul>

          <h2>4. Almacenamiento local (Cookies y LocalStorage)</h2>
          <p>
            HistoriAR utiliza almacenamiento local del navegador (<code>localStorage</code>) con el único fin de recordar preferencias de navegación (como el estado de avisos o filtros de búsqueda seleccionados). No utilizamos cookies de terceros para publicidad dirigida ni venta de datos.
          </p>

          <h2>5. Enlaces a sitios externos</h2>
          <p>
            Nuestras fichas informativas pueden incluir enlaces a recursos de referencia externa (como fuentes históricas o enlaces a tiendas de aplicaciones). No nos hacemos responsables de las prácticas de privacidad ni del contenido de dichos sitios ajenos a HistoriAR.
          </p>

          <h2>6. Contacto y ejercicio de derechos</h2>
          <p>
            Si tienes dudas, sugerencias o deseas realizar consultas sobre el tratamiento de datos en HistoriAR, puedes ponerte en contacto con el equipo a través de los canales oficiales del proyecto o visitando nuestro repositorio público.
          </p>
        </article>
      </main>

      <AppFooter />
    </div>
  );
}


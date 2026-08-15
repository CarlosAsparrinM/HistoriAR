import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { QuizClient } from '@/components/quiz/quiz-client';
import { AppHeader } from '@/components/layout/app-header';
import { JsonLd } from '@/components/seo/json-ld';
import { ApiError } from '@/lib/api/errors';
import { getMonument, getQuizByMonument } from '@/lib/api/server';
import { absoluteUrl, defaultOgImage, siteName, siteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    const monument = await getMonument(id);
    const title = `Quiz sobre ${monument.name}`;
    const description = `Pon a prueba tus conocimientos sobre ${monument.name} con este quiz educativo interactivo en HistoriAR.`;
    const canonical = `/monumentos/${encodeURIComponent(id)}/quiz`;
    const images = monument.imageUrl ? [{ url: monument.imageUrl, alt: `Quiz sobre ${monument.name}` }] : [defaultOgImage];

    return {
      title,
      description,
      alternates: { canonical },
      robots: { index: false, follow: true },
      openGraph: {
        title: `${title} | ${siteName}`,
        description,
        url: canonical,
        type: 'website',
        images,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} | ${siteName}`,
        description,
        images: images.map((img) => (typeof img === 'string' ? img : img.url)),
      },
    };
  } catch {
    return { title: 'Quiz educativo', robots: { index: false, follow: true } };
  }
}

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let monument;
  try {
    monument = await getMonument(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const quiz = await getQuizByMonument(id);
  if (!quiz) notFound();

  const monumentUrl = absoluteUrl(`/monumentos/${encodeURIComponent(id)}`);
  const quizUrl = absoluteUrl(`/monumentos/${encodeURIComponent(id)}/quiz`);

  return (
    <div className="flutter-screen">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Explorar', item: absoluteUrl('/explorar') },
          { '@type': 'ListItem', position: 3, name: monument.name, item: monumentUrl },
          { '@type': 'ListItem', position: 4, name: `Quiz: ${monument.name}`, item: quizUrl },
        ],
      }} />
      <AppHeader title={`Quiz: ${monument.name}`} backHref={`/monumentos/${id}`} />
      <div className="quiz-page">
        <QuizClient quiz={quiz} monumentId={id} />
      </div>
    </div>
  );
}


import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { QuizClient } from '@/components/quiz/quiz-client';
import { AppHeader } from '@/components/layout/app-header';
import { ApiError } from '@/lib/api/errors';
import { getMonument, getQuizByMonument } from '@/lib/api/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    const monument = await getMonument(id);
    const title = `Quiz sobre ${monument.name}`;
    const description = `Pon a prueba tus conocimientos sobre ${monument.name} con este quiz educativo de HistoriAR.`;
    return {
      title,
      description,
      alternates: { canonical: `/monumentos/${encodeURIComponent(id)}/quiz` },
      robots: { index: false, follow: true },
      openGraph: { title, description, images: [] },
      twitter: { card: 'summary', title, description, images: [] },
    };
  } catch {
    return { title: 'Quiz educativo', robots: { index: false, follow: true } };
  }
}

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let monument;
  try { monument = await getMonument(id); } catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
  const quiz = await getQuizByMonument(id);
  if (!quiz) notFound();
  return <div className="flutter-screen"><AppHeader title={`Quiz: ${monument.name}`} backHref={`/monumentos/${id}`} /><div className="quiz-page"><QuizClient quiz={quiz} monumentId={id} /></div></div>;
}

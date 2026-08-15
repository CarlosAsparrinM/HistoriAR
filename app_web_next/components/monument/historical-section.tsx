import Image from 'next/image';

import type { HistoricalEntry } from '@/lib/api/schemas';
import { HistoricalAudioButton } from '@/components/monument/historical-audio-button';

export function HistoricalSection({ entries }: { entries: HistoricalEntry[] }) {
  if (entries.length === 0) return <p>La información histórica está en preparación.</p>;
  return <div className="history-list">{entries.sort((a, b) => a.order - b.order).map((entry) => <article className="history-entry" key={entry.id}>
    {entry.imageUrl && <Image className="history-image" src={entry.imageUrl} alt={`Imagen de ${entry.title}`} width={180} height={180} unoptimized />}
    <div className="history-copy"><div className="history-title-row"><h3>{entry.title}</h3><HistoricalAudioButton text={entry.description} /></div>{entry.description && <p>{entry.description}</p>}</div>
  </article>)}</div>;
}

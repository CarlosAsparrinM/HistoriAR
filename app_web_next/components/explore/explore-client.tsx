'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Box, Landmark, Search } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';

import { searchMonuments } from '@/lib/api/browser';
import type { MonumentList } from '@/lib/api/schemas';

const MonumentMap = dynamic(() => import('@/components/explore/monument-map').then((module) => module.MonumentMap), {
  ssr: false,
  loading: () => <div className="loading">Cargando mapa…</div>,
});

export function ExploreClient({ initialData, initialText }: { initialData: MonumentList; initialText: string }) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  async function load(text: string, page: number, append = false) {
    const request = ++latestRequest.current;
    setLoading(true);
    setError(null);
    try {
      const result = await searchMonuments(text, page);
      if (request !== latestRequest.current) return;
      setData((previous) => append ? { ...result, items: [...previous.items, ...result.items] } : result);
      const params = new URLSearchParams();
      if (text.trim()) params.set('q', text.trim());
      if (page > 1) params.set('page', String(page));
      window.history.replaceState(null, '', `/explorar${params.size ? `?${params}` : ''}`);
    } catch (caught) {
      if (request === latestRequest.current) setError(caught instanceof Error ? caught.message : 'No se pudo actualizar el catálogo.');
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (query !== initialText) void load(query, 1);
    }, 400);
    return () => window.clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(query, 1);
  }

  return (
    <section className="explore-page" aria-labelledby="explore-title">
      <h1 className="sr-only" id="explore-title">Explora monumentos y patrimonio cultural del Perú</h1>
      <div className="explore-stage">
        <aside className="ad-slot explore-ad" aria-label="Espacio publicitario"><span>PUBLICIDAD</span><small>Lateral izquierdo<br />160 × 600</small></aside>
        <div className="explore-layout">
          <MonumentMap monuments={data.items} />
          <div className="monument-list" aria-busy={loading}>
            <form className="search-form" onSubmit={submit} role="search">
              <label><span>Buscar monumentos</span><input aria-label="Buscar monumentos" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o distrito" /></label>
              <button className="search-icon-button" type="submit" aria-label="Buscar"><Search size={24} /></button>
            </form>
            {error && <p className="inline-error" role="alert">{error}</p>}
          <div className="list-items">
            {data.items.length === 0 ? <div className="empty">No se encontraron monumentos publicados.</div> : data.items.map((monument) => {
              const metadata = [monument.location.district, monument.culture ?? monument.cultures?.[0]].filter(Boolean).join(' · ');
              return <Link className="monument-card" href={`/monumentos/${monument._id}`} key={monument._id}>
                {monument.imageUrl ? <Image className="thumb" src={monument.imageUrl} alt="" width={40} height={40} unoptimized /> : <span className="thumb-placeholder"><Landmark size={23} aria-hidden /></span>}
                <span className="card-copy"><h2 className="card-title">{monument.name}{monument.model3DUrl && <Box size={16} aria-label="Modelo 3D disponible" />}</h2><span className="card-meta">{metadata || 'Información de ubicación en preparación'}</span></span>
              </Link>;
            })}
          </div>
          {data.items.length < data.total && <div className="load-more"><button className="secondary-button" disabled={loading} onClick={() => void load(query, data.page + 1, true)}>{loading ? 'Cargando…' : 'Cargar más'}</button></div>}
          </div>
        </div>
        <aside className="ad-slot explore-ad explore-ad-right" aria-label="Espacio publicitario"><span>PUBLICIDAD</span><small>Lateral derecho<br />160 × 600</small></aside>
      </div>
    </section>
  );
}

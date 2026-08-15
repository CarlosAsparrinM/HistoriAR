'use client';

import { Volume2 } from 'lucide-react';

export function HistoricalAudioButton({ text }: { text: string }) {
  const speak = () => {
    if (!('speechSynthesis' in window) || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-PE';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };
  return <button className="history-audio-button" type="button" onClick={speak} disabled={!text.trim()} title="Escuchar ficha histórica" aria-label="Escuchar ficha histórica"><Volume2 size={24} /></button>;
}

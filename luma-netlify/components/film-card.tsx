'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Bookmark, Film as FilmIcon, Play } from 'lucide-react';
import type { Film } from '@/lib/types';

// One observer for all cards. Only download a poster as it approaches the viewport.
let observer: IntersectionObserver | undefined;
const waiting = new Map<Element, () => void>();

function observePoster(element: Element, show: () => void) {
  if (typeof IntersectionObserver === 'undefined') {
    show();
    return () => {};
  }
  if (!observer) {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const callback = waiting.get(entry.target);
        waiting.delete(entry.target);
        observer?.unobserve(entry.target);
        callback?.();
      }
    }, { rootMargin: '300px 0px' });
  }
  waiting.set(element, show);
  observer.observe(element);
  return () => {
    waiting.delete(element);
    observer?.unobserve(element);
  };
}

type Props = {
  film: Film;
  saved: boolean;
  language: 'en' | 'ar';
  detailsLabel: string;
  saveLabel: string;
  removeLabel: string;
  seriesLabel: string;
  moviesLabel: string;
  onOpen: (film: Film) => void;
  onSave: (film: Film) => void;
};

export const FilmCard = memo(function FilmCard({
  film, saved, language, detailsLabel, saveLabel, removeLabel,
  seriesLabel, moviesLabel, onOpen, onSave,
}: Props) {
  const card = useRef<HTMLElement>(null);
  const [nearby, setNearby] = useState(false);

  useEffect(() => {
    if (!film.poster || !card.current || nearby) return;
    return observePoster(card.current, () => setNearby(true));
  }, [film.poster, nearby]);

  return <article className="film-card" ref={card}>
    <div className="poster">
      <button className="poster-open" onClick={() => onOpen(film)} aria-label={`${detailsLabel}: ${film.title}`}>
        {film.poster && nearby ? <img src={film.poster} alt={`${film.title} poster`} loading="lazy" decoding="async" onError={e => { e.currentTarget.style.display = 'none'; }} /> : null}
        <div className="poster-fallback"><FilmIcon size={28}/><span>{film.title}</span></div>
        <div className="poster-shade"/><span className="poster-play"><Play size={23} fill="currentColor"/></span>
      </button>
      <button className={`save-button ${saved ? 'is-saved' : ''}`} onClick={() => onSave(film)} aria-label={`${saved ? removeLabel : saveLabel}: ${film.title}`}>
        <Bookmark size={17} fill={saved ? 'currentColor' : 'none'}/>
      </button>
      <span className="poster-kind">{film.type === 'tv' ? 'SERIES' : 'FILM'}</span>
    </div>
    <button className="film-title" onClick={() => onOpen(film)}>{language === 'ar' && film.arabicTitle ? film.arabicTitle : film.title}</button>
    <div className="film-meta"><span>{film.year || '—'}</span><span className="dot"/><span>{film.genre || (film.type === 'tv' ? seriesLabel : moviesLabel)}</span></div>
  </article>;
});

import {type Film, filmKey} from './types';

export type WatchEntry = {film:Film; time?:number; duration?:number; opened:number; season?:number; episode?:number};

// Recent viewing matters most; keep a little variety and avoid already opened titles.
export function discoverFilms(catalog:Film[], history:WatchEntry[], day:number):Film[] {
  const watched=new Set(history.map(h=>filmKey(h.film))),imdbWatched=new Set(history.filter(h=>h.film.imdb).map(h=>`${h.film.type}:${h.film.imdb}`));
  const seen=(film:Film)=>watched.has(filmKey(film))||!!film.imdb&&imdbWatched.has(`${film.type}:${film.imdb}`);
  const score=(film:Film)=>history.slice(0,12).reduce((total,h,index)=>{
    const weight=1/(index+1);
    return total+weight*((film.genre&&film.genre===h.film.genre?6:0)+(film.type===h.film.type?1:0)+(film.year&&h.film.year&&Math.abs(film.year-h.film.year)<=12?2:0));
  },0);
  const rotation=((day%catalog.length)+catalog.length)%catalog.length;
  return catalog.map((film,index)=>({film,index:(index-rotation+catalog.length)%catalog.length,score:score(film)}))
    .sort((a,b)=>Number(seen(a.film))-Number(seen(b.film))||b.score-a.score||a.index-b.index)
    .map(item=>item.film);
}

import {type Film, filmKey} from './types';

export type WatchEntry = {film:Film; time?:number; duration?:number; opened:number; season?:number; episode?:number};

// Recent viewing matters most; keep a little variety and avoid already opened titles.
export function discoverFilms(catalog:Film[], history:WatchEntry[], day:number):Film[] {
  const watched=new Set(history.map(h=>filmKey(h.film)));
  const score=(film:Film)=>history.slice(0,12).reduce((total,h,index)=>{
    const weight=1/(index+1);
    return total+weight*((film.genre&&film.genre===h.film.genre?6:0)+(film.type===h.film.type?1:0)+(film.year&&h.film.year&&Math.abs(film.year-h.film.year)<=12?2:0));
  },0);
  const rotation=((day%catalog.length)+catalog.length)%catalog.length;
  return catalog.map((film,index)=>({film,index:(index-rotation+catalog.length)%catalog.length,score:score(film)}))
    .sort((a,b)=>Number(watched.has(filmKey(a.film)))-Number(watched.has(filmKey(b.film)))||b.score-a.score||a.index-b.index)
    .map(item=>item.film);
}

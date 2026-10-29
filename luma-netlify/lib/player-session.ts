import {filmKey,type Film} from './types';
import type {WatchEntry} from './discovery';

// Changing episodes must not carry the old episode's timestamp into the new one.
export function rememberSelection(history:WatchEntry[],film:Film,season:number,episode:number,opened=Date.now()):WatchEntry[]{
  const previous=history.find(entry=>filmKey(entry.film)===filmKey(film));
  const sameEpisode=film.type!=='tv'||((previous?.season??1)===season&&(previous?.episode??1)===episode);
  const entry:WatchEntry={...(sameEpisode?previous:undefined),film,opened,...(film.type==='tv'?{season,episode}:{})};
  return [entry,...history.filter(item=>filmKey(item.film)!==filmKey(film))].slice(0,32);
}

export function validEpisode(season:unknown,episode:unknown):season is number {
  return typeof season==='number'&&Number.isInteger(season)&&season>=0&&season<=100&&
    typeof episode==='number'&&Number.isInteger(episode)&&episode>=1&&episode<=1000;
}

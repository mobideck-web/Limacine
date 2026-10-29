import type {Film} from './types';
export const players=[
  {id:'framextv',name:'FrameXTV',origin:'https://framextv.cc',embedded:true},
  {id:'cinesrc',name:'CineSrc',origin:'https://cinesrc.st',embedded:true},
  {id:'vidly',name:'Vidly',origin:'https://vidly.pro',embedded:false},
  {id:'vidsrc',name:'VidSrc',origin:'https://vidsrc.sh',embedded:false},
] as const;
export type PlayerId=typeof players[number]['id'];
// FrameXTV currently uses .cc, while .xyz is also a documented provider origin.
// The caller must also verify event.source against the active iframe.
export function isTrustedPlayerOrigin(provider:PlayerId,origin:string){
  const player=players.find(item=>item.id===provider);
  return origin===player?.origin||(provider==='framextv'&&origin==='https://framextv.xyz');
}
export function playerUrl(provider:PlayerId,film:Film,season=1,episode=1,resumeAt=0){
  const path=film.type==='tv'?`tv/${film.id}/${season}/${episode}`:`movie/${film.id}`;
  const start=Number.isFinite(resumeAt)&&resumeAt>0&&resumeAt<1000000?`&t=${Math.floor(resumeAt)}`:'';
  if(provider==='framextv')return `https://framextv.cc/embed/${film.id}${film.type==='tv'?`/${season}/${episode}`:''}?autoplay=0&muted=0${start}`;
  if(provider==='cinesrc'){
    const params=new URLSearchParams({autoplay:'false',autonext:'false',quality:'480'});
    if(film.type==='tv'){params.set('s',String(season));params.set('e',String(episode));}
    if(start)params.set('t',String(Math.floor(resumeAt)));
    return `https://cinesrc.st/embed/${film.type}/${film.id}?${params}`;
  }
  if(provider==='vidly')return `https://vidly.pro/${path}?autoplay=0&color=f29164&nextEpisode=0`;
  return `https://vidsrc.sh/embed/${path}?ds_lang=ar&autoplay=0&autonext=0`;
}

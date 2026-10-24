import {filmKey,tmdbId,type Film} from './types';

export const players=[
  {id:'framextv',name:'FrameXTV',origin:'https://framextv.cc',origins:['https://framextv.cc','https://framextv.xyz'],sandbox:'allow-scripts allow-same-origin allow-presentation',subtitlePreference:false,enabled:true},
  {id:'cinesrc',name:'CineSrc',origin:'https://cinesrc.st',origins:['https://cinesrc.st'],sandbox:'allow-scripts allow-same-origin allow-presentation',subtitlePreference:false,enabled:true},
  {id:'vidsrc',name:'VidSrc',origin:'https://vidsrc.sh',origins:['https://vidsrc.sh'],sandbox:'allow-scripts allow-same-origin allow-presentation',subtitlePreference:true,enabled:true},
  {id:'vidly',name:'Vidly',origin:'https://vidly.pro',origins:['https://vidly.pro'],sandbox:'allow-scripts allow-same-origin allow-presentation',subtitlePreference:false,enabled:true},
  {id:'vidlink',name:'VidLink',origin:'https://vidlink.pro',origins:['https://vidlink.pro'],sandbox:'allow-scripts allow-same-origin allow-presentation',subtitlePreference:false,enabled:true},
  {id:'vidfast',name:'VidFast',origin:'https://vidfast.vc',origins:['https://vidfast.vc'],sandbox:'allow-scripts allow-same-origin allow-presentation',subtitlePreference:true,enabled:true},
  {id:'primesrc',name:'PrimeSrc',origin:'https://primesrc.me',origins:['https://primesrc.me'],sandbox:'allow-scripts allow-same-origin allow-presentation',subtitlePreference:false,enabled:true},
  {id:'embedsu',name:'Embed.su',origin:'https://embed.su',origins:['https://embed.su'],sandbox:'allow-scripts allow-same-origin allow-presentation',subtitlePreference:false,enabled:true},
  {id:'autoembed',name:'AutoEmbed',origin:'https://autoembed.me',origins:['https://autoembed.me'],sandbox:'allow-scripts allow-same-origin allow-presentation',subtitlePreference:false,enabled:true},
] as const;
export type PlayerId=typeof players[number]['id'];
// Only sources with verified protected playback and progress reporting enter automatic fallback.
export const verifiedPlayers:ReadonlySet<PlayerId>=new Set(['framextv','cinesrc']);
export const automaticPlayers:ReadonlySet<PlayerId>=new Set(['framextv']);
export function sourceReason(id:PlayerId,ar=false){
 if(id==='autoembed')return ar?'يدوي · رفض التضمين في آخر اختبار':'Manual · refused embedding in last test';
 if(id==='primesrc')return ar?'يدوي · لم يتم التحقق من تشغيل الفيديو':'Manual · playback not verified';
 if(id==='embedsu')return ar?'يدوي · تعذر الاتصال في آخر اختبار':'Manual · unreachable in last test';
 if(['vidsrc','vidly','vidlink','vidfast'].includes(id))return ar?'يدوي · رفض حماية النوافذ في آخر اختبار':'Manual · refused popup protection in last test';
 if(id==='cinesrc')return ar?'مصدر يدوي · تم التحقق من فيلم؛ التوفر يختلف':'Manual · film playback verified; availability varies';
 return ar?'تشغيل محمي تم التحقق منه':'Protected playback verified';
}
export type SubtitleLanguage='ar'|'en'|'off';
export type ProgressUpdate={time:number;duration?:number;state:'playing'|'paused'|'seeked'|'ended';season:number;episode:number};
export type PlayerSignal=Omit<ProgressUpdate,'season'|'episode'>|{state:'error';message:string};
export type PlayerHealth={successes:number;failures:number;startupMs?:number;lastSuccess?:number;lastFailure?:number};
export type HealthStore={global:Partial<Record<PlayerId,PlayerHealth>>;titles:Record<string,Partial<Record<PlayerId,PlayerHealth>>>};
export const emptyHealth=():HealthStore=>({global:{},titles:{}});

export function playerUrl(provider:PlayerId,film:Film,season=1,episode=1,options:{language?:SubtitleLanguage;resume?:number}={}){
  const numeric=tmdbId(film),id=numeric||film.imdb;
  if(isNaN(season)||isNaN(episode)||!Number.isInteger(season)||!Number.isInteger(episode)||season<0||season>100||episode<1||episode>1000)return '';
  if(!id||(!numeric&&!['vidsrc','vidfast','primesrc','autoembed'].includes(provider)))return '';
  const path=film.type==='tv'?`tv/${id}/${season}/${episode}`:`movie/${id}`;
  const resume=Number.isFinite(options.resume)?Math.max(0,Math.floor(options.resume!)):0;
  if(provider==='autoembed')return `https://autoembed.me/${film.type}/${numeric?'tmdb':'imdb'}/${id}${film.type==='tv'?`-${season}-${episode}`:''}`;
  if(provider==='framextv')return `https://framextv.cc/embed/${numeric}${film.type==='tv'?`/${season}/${episode}`:''}?autoplay=1&muted=1${resume?`&t=${resume}`:''}`;
  if(provider==='vidly')return `https://vidly.pro/${path}?autoplay=1&color=f29164&nextEpisode=0${resume?`&t=${resume}`:''}`;
  if(provider==='vidlink')return `https://vidlink.pro/${path}?autoplay=true&nextbutton=false&primaryColor=f29164${resume?`&startAt=${resume}`:''}`;
  if(provider==='vidfast')return `https://vidfast.vc/${path}?autoPlay=true&sub=ar${resume?`&startAt=${resume}`:''}`;
  if(provider==='cinesrc')return `https://cinesrc.st/embed/${film.type}/${numeric}?autonext=false&continueprompt=false&subtitles=off${film.type==='tv'?`&s=${season}&e=${episode}`:''}${resume?`&t=${resume}`:''}`;
  if(provider==='primesrc'){const q=new URLSearchParams(numeric?{tmdb:String(numeric)}:{imdb:film.imdb!});if(film.type==='tv'){q.set('season',String(season));q.set('episode',String(episode));}if(resume)q.set('startAt',String(resume));return `https://primesrc.me/embed/${film.type}?${q}`;}
  if(provider==='embedsu')return `https://embed.su/embed/${path}`;
  const q=new URLSearchParams({autoplay:'1',autonext:'0'});
  if(options.language!=='off')q.set('ds_lang',options.language==='en'?'en':'ar');
  if(resume)q.set('startAt',String(resume));
  return `https://vidsrc.sh/embed/${path}?${q}`;
}

function finiteTime(value:unknown){return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<1_000_000;}
function object(value:unknown):Record<string,unknown>|null{return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;}
export function parsePlayerSignal(provider:PlayerId,origin:string,payload:unknown,film:Film,season:number,episode:number):PlayerSignal|null{
  const player=players.find(p=>p.id===provider)!;
  if(!(player.origins as readonly string[]).includes(origin))return null;
  let raw=payload;if(typeof raw==='string'){if(raw.length>16000)return null;try{raw=JSON.parse(raw);}catch{return null;}}
  const d=object(raw);if(!d)return null;
  let time:unknown,duration:unknown,state:ProgressUpdate['state']='playing';
  if(provider==='framextv'){
    if(d.event==='frameXTV:error')return {state:'error',message:'This source reported a playback error.'};
    if(d.event!=='frameXTV:timeupdate')return null;
    time=d.currentTime;duration=d.duration;
    if(d.paused===true||d.playing===false)state='paused';
    if(d.ended===true)state='ended';
  }else if(provider==='vidly'){
    if(d.type!=='VIDLY_PLAYER_EVENT')return null;const data=object(d.data);if(!data)return null;
    if(String(data.tmdbId)!==String(film.id)||data.mediaType!==film.type)return null;
    if(film.type==='tv'&&(Number(data.season)!==season||Number(data.episode)!==episode))return null;
    if(data.event==='error')return {state:'error',message:'This source reported a playback error.'};
    if(!['play','pause','timeupdate','seeked','ended'].includes(String(data.event)))return null;
    time=data.currentTime;duration=data.duration;
    state=data.event==='pause'?'paused':data.event==='ended'?'ended':data.event==='seeked'?'seeked':'playing';
  }else if(provider==='vidlink'){
    if(d.type!=='PLAYER_EVENT')return null;const data=object(d.data);if(!data)return null;
    if(String(data.tmdbId??data.mtmdbId)!==String(tmdbId(film))||data.mediaType!==film.type)return null;
    if(film.type==='tv'&&(Number(data.season)!==season||Number(data.episode)!==episode))return null;
    if(!['play','pause','timeupdate','seeked','ended'].includes(String(data.event)))return null;
    time=data.currentTime;duration=data.duration;state=data.event==='pause'?'paused':data.event==='ended'?'ended':data.event==='seeked'?'seeked':'playing';
  }else if(provider==='cinesrc'){
    if(d.type==='cinesrc:error')return {state:'error',message:'This source reported a playback error.'};
    if(!['cinesrc:timeupdate','cinesrc:seeked'].includes(String(d.type)))return null;
    time=d.currentTime;duration=d.duration;state=d.type==='cinesrc:seeked'?'seeked':'playing';
  }else if(provider==='vidsrc'){
    if(d.type!=='PLAYER_EVENT')return null;const data=object(d.data),info=object(data?.player_info);if(!data||!info)return null;
    if(String(info.tmdb)!==String(film.id)&&(!film.imdb||info.imdb!==film.imdb))return null;
    if(info.mediaType!==film.type)return null;
    if(film.type==='tv'&&(Number(info.season)!==season||Number(info.episode)!==episode))return null;
    if(data.player_status==='error')return {state:'error',message:'This source reported a playback error.'};
    if(!['playing','paused','seeked','completed'].includes(String(data.player_status)))return null;
    time=data.player_progress;duration=data.player_duration;
    state=data.player_status==='paused'?'paused':data.player_status==='completed'?'ended':data.player_status==='seeked'?'seeked':'playing';
  }else return null;
  if(!finiteTime(time))return null;
  return {state,time:time as number,duration:finiteTime(duration)&&Number(duration)>0?Number(duration):undefined};
}

export function titleKey(film:Film,season=1,episode=1){return `${filmKey(film)}${film.type==='tv'?`-${season}-${episode}`:''}`;}
export function readHealth(value:unknown):HealthStore{
  const root=object(value);if(!root)return emptyHealth();
  const clean=(input:unknown)=>{const result:Partial<Record<PlayerId,PlayerHealth>>={};const entries=object(input);if(!entries)return result;for(const p of players){const s=object(entries[p.id]);if(!s)continue;const count=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(500,Math.floor(v))):0;result[p.id]={successes:count(s.successes),failures:count(s.failures),startupMs:typeof s.startupMs==='number'&&Number.isFinite(s.startupMs)?Math.max(0,Math.min(120000,s.startupMs)):undefined,lastSuccess:finiteTimeStamp(s.lastSuccess),lastFailure:finiteTimeStamp(s.lastFailure)};}return result;};
  const titles:HealthStore['titles']={};for(const [key,v] of Object.entries(object(root.titles)||{}).slice(-80))if(/^(movie|tv)-\d+(?:-\d+-\d+)?$/.test(key))titles[key]=clean(v);
  return {global:clean(root.global),titles};
}
function finiteTimeStamp(value:unknown){return typeof value==='number'&&Number.isFinite(value)&&value>0?value:undefined;}
export function recordOutcome(store:HealthStore,key:string,provider:PlayerId,worked:boolean,startupMs:number,now=Date.now()):HealthStore{
  const update=(old?:PlayerHealth):PlayerHealth=>({successes:Math.min(500,(old?.successes||0)+(worked?1:0)),failures:Math.min(500,(old?.failures||0)+(worked?0:1)),startupMs:worked?Math.round(old?.startupMs===undefined?startupMs:old.startupMs*.65+startupMs*.35):old?.startupMs,lastSuccess:worked?now:old?.lastSuccess,lastFailure:worked?old?.lastFailure:now});
  const titles={...store.titles,[key]:{...store.titles[key],[provider]:update(store.titles[key]?.[provider])}};
  const keys=Object.keys(titles);for(const stale of keys.slice(0,Math.max(0,keys.length-80)))delete titles[stale];
  return {global:{...store.global,[provider]:update(store.global[provider])},titles};
}
export function rankPlayers(store:HealthStore,key:string,exclude:ReadonlySet<PlayerId>=new Set(),options:{subtitleRecovery?:boolean;unavailable?:ReadonlySet<PlayerId>;now?:number}={}):PlayerId[]{
  const now=options.now||Date.now();
  const score=(id:PlayerId)=>{
    let result=id==='framextv'?60:id==='vidly'?57:42;
    for(const [s,weight] of [[store.global[id],.5],[store.titles[key]?.[id],1.8]] as const){
      if(!s)continue;result+=weight*Math.min(15,s.successes*4);result-=weight*Math.min(20,s.failures*3);
      if(s.startupMs!==undefined)result+=weight*Math.max(-8,10-s.startupMs/1500);
      if(s.lastFailure&&now-s.lastFailure<30*60_000&&s.lastFailure>(s.lastSuccess||0))result-=weight*32;
    }
    if(options.subtitleRecovery&&id==='vidsrc')result+=90;
    if(options.unavailable?.has(id))result-=300;
    return result;
  };
  return players.filter(p=>p.enabled&&automaticPlayers.has(p.id)&&!exclude.has(p.id)&&!options.unavailable?.has(p.id)).map(p=>p.id).sort((a,b)=>score(b)-score(a));
}

export type FailoverState={connected:boolean;paused:boolean;loaded:boolean;activeMs:number;sinceProgressMs:number;hasKnownPlayingState:boolean};
export function shouldFailover(s:FailoverState){
  if(s.paused)return false;
  if(!s.connected)return s.activeMs>=(s.loaded?24000:12000);
  return s.hasKnownPlayingState&&s.sinceProgressMs>=22000;
}

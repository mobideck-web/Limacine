import {youtubeTitles} from './collections';
import type {Film} from './types';

export const youtubeChannels=[
 {id:'UCET6sWl4Xcu-U8Ka9PJPrwA',name:'DW Documentary وثائقية دي دبليو',category:'documentary',language:'ar'},
 {id:'UC0LSnqrwqtMwl2YwfUpO66g',name:'Al Jazeera Documentary الجزيرة الوثائقية',category:'documentary',language:'ar'},
 {id:'UCm5U4zqpahzyNXBv5ZT51Jw',name:'Mosfilm',category:'film',language:'ru'},
 {id:'UCz75RVbH8q2jdBJ4SnwuZZQ',name:'Blender Studio',category:'short',language:'und'},
] as const;
type Channel=typeof youtubeChannels[number];
type Json=Record<string,any>;
export type YouTubeStatus={mode:'live'|'cached'|'fallback';updatedAt:string|null;nextRefreshAt:string|null;channels:{name:string;status:'ok'|'unavailable'}[]};
type Snapshot={films:Film[];status:YouTubeStatus};
const TTL=30*60_000,RETRY=60_000;
let snapshot:Snapshot|undefined,pending:Promise<Snapshot>|undefined,lastAttempt=0;
const known=new Map(youtubeTitles.map(f=>[String(f.id),f]));
function remember(film:Film){known.set(String(film.id),film);if(known.size>240){const stale=[...known.keys()].find(id=>!youtubeTitles.some(f=>f.id===id));if(stale)known.delete(stale);}}
export function cachedYouTube(){return snapshot?.films||youtubeTitles;}

async function html(url:string,signal:AbortSignal,fetcher:typeof fetch){
 const r=await fetcher(url,{signal,redirect:'error',headers:{'Accept-Language':'en','User-Agent':'Mozilla/5.0 (compatible; Luma public video catalog)'}});
 if(!r.ok||Number(r.headers.get('content-length'))>6_000_000)throw Error('Channel unavailable');
 const reader=r.body?.getReader();if(!reader)throw Error('Empty response');let size=0;const chunks:Uint8Array[]=[];
 try{for(;;){const x=await reader.read();if(x.done)break;size+=x.value.length;if(size>6_000_000)throw Error('Response too large');chunks.push(x.value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}
 const bytes=new Uint8Array(size);let offset=0;for(const x of chunks){bytes.set(x,offset);offset+=x.length;}return new TextDecoder().decode(bytes);
}
export function pageJson(source:string,name:'ytInitialData'|'ytInitialPlayerResponse'):Json{
 const start=source.indexOf(`var ${name} = `);if(start<0)throw Error('Public metadata unavailable');
 const from=source.indexOf('{',start);let depth=0,inString=false,escape=false;
 for(let i=from;i<source.length;i++){const c=source[i];if(inString){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')inString=false;}else if(c==='"')inString=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0)return JSON.parse(source.slice(from,i+1));}
 throw Error('Incomplete public metadata');
}
function seconds(value:string){return value.split(':').reduce((n,s)=>n*60+Number(s),0);}
function suitable(title:string,duration:number,channel:Channel){
 if(!Number.isFinite(duration)||/trailer|teaser|fragment|\bclip\b|making.of|studio log|behind.the.scenes|كواليس|إعلان|اعلان|مقتطف|الجزء\s*\d|part\s*\d|episode\s*\d/i.test(title))return false;
 if(channel.category==='short')return duration>=120&&duration<=1800&&/open movie|singularity|dogwalk|sprite fright|coffee run|spring|charge|فيلم.*المفتوح/i.test(title);
 return duration>=(channel.category==='film'?3600:1200);
}
export function channelCandidates(data:Json,channel:Channel){
 const out:{id:string;title:string;seconds:number}[]=[];
 function walk(x:any){if(!x||typeof x!=='object')return;
  if(x.lockupViewModel){const v=x.lockupViewModel,title=v.metadata?.lockupMetadataViewModel?.title?.content||'',badges=v.contentImage?.thumbnailViewModel?.overlays?.flatMap((o:Json)=>o.thumbnailBottomOverlayViewModel?.badges||[])||[],duration=badges.find((b:Json)=>b.thumbnailBadgeViewModel?.text)?.thumbnailBadgeViewModel.text;
   if(/^[\w-]{11}$/.test(v.contentId)&&duration&&suitable(title,seconds(duration),channel))out.push({id:v.contentId,title,seconds:seconds(duration)});
  }
  if(x.videoRenderer){const v=x.videoRenderer,title=v.title?.runs?.map((r:Json)=>r.text).join('')||'',duration=v.lengthText?.simpleText;if(/^[\w-]{11}$/.test(v.videoId)&&duration&&suitable(title,seconds(duration),channel))out.push({id:v.videoId,title,seconds:seconds(duration)});}
  for(const [k,v]of Object.entries(x))if(k!=='lockupViewModel'&&k!=='videoRenderer'){if(Array.isArray(v))v.forEach(walk);else walk(v);}
 }
 walk(data);return [...new Map(out.map(x=>[x.id,x])).values()].slice(0,8);
}
export function videoFilm(data:Json,expectedId:string):Film{
 const v=data.videoDetails,channel=youtubeChannels.find(c=>c.id===v?.channelId),duration=Number(v?.lengthSeconds);
 if(data.playabilityStatus?.status!=='OK'||data.playabilityStatus?.playableInEmbed!==true||v?.videoId!==expectedId||v?.isLiveContent||!channel||!suitable(v.title,duration,channel))throw Error('Not an eligible official upload');
 const published=data.microformat?.playerMicroformatRenderer?.publishDate,title=String(v.title).replace(/^وثائقي\s*\|\s*/,'').replace(/\s*\|\s*وثائقية دي دبليو$/,'').slice(0,220);
 const releaseYear=channel.category==='film'?Number(title.match(/\b(?:18|19|20)\d{2}\b/)?.[0]):0;
 return {id:expectedId,identity:'youtube',type:'movie',title,arabicTitle:channel.language==='ar'?title:undefined,audioLanguage:channel.language,channel:channel.name,publisherUrl:`https://www.youtube.com/channel/${channel.id}`,durationSeconds:duration,runtime:`${Math.ceil(duration/60)} min${channel.category==='short'?' · Short':''}`,year:releaseYear||Number(String(published||'').slice(0,4))||undefined,category:channel.category,genre:channel.category==='documentary'?'Documentary':channel.category==='short'?'Animation':'Drama',genres:[channel.category==='documentary'?'Documentary':channel.category==='short'?'Animation':'Drama'],overview:String(v.shortDescription||'').replace(/https?:\/\/\S+/g,'').slice(0,700),source:'YouTube',free:true,poster:`https://i.ytimg.com/vi/${expectedId}/hqdefault.jpg`,creditUrl:`https://www.youtube.com/watch?v=${expectedId}`,license:'Official publisher upload · YouTube embed',verifiedAt:new Date().toISOString(),publishedAt:published};
}
async function verify(id:string,signal:AbortSignal,fetcher:typeof fetch){return videoFilm(pageJson(await html(`https://www.youtube.com/watch?v=${id}&hl=en`,signal,fetcher),'ytInitialPlayerResponse'),id);}
export function knownYouTube(id:string){return known.get(id);}
export async function resolveYouTube(id:string){
 if(!/^[\w-]{11}$/.test(id))throw Error('Invalid publisher video');const old=known.get(id);if(old)return old;
 const film=await verify(id,AbortSignal.timeout(7000),fetch);remember(film);return film;
}
export async function liveYouTube(options:{refresh?:boolean;fetcher?:typeof fetch;now?:number}={}):Promise<Snapshot>{
 const now=options.now??Date.now(),fetcher=options.fetcher||fetch;
 if(snapshot&&now-lastAttempt<(options.refresh||snapshot.status.mode==='fallback'?RETRY:TTL))return {...snapshot,status:{...snapshot.status,mode:snapshot.status.mode==='fallback'?'fallback':'cached'}};
 if(pending)return pending;
 lastAttempt=now;
 pending=(async()=>{
  const signal=AbortSignal.timeout(18_000),channelResults=await Promise.allSettled(youtubeChannels.map(async c=>({channel:c,candidates:channelCandidates(pageJson(await html(`https://www.youtube.com/channel/${c.id}/videos?hl=en`,AbortSignal.any([signal,AbortSignal.timeout(6000)]),fetcher),'ytInitialData'),c)})));
  const statuses=channelResults.map((r,i)=>({name:youtubeChannels[i].name,status:r.status==='fulfilled'&&r.value.candidates.length?'ok':'unavailable'} as const));
  // Round-robin verification bounds work and gives each publisher a fair share.
  const candidates:{id:string}[]=[];for(let i=0;i<3;i++)for(const r of channelResults)if(r.status==='fulfilled'&&r.value.candidates[i])candidates.push(r.value.candidates[i]);
  const fresh:Film[]=[];
  for(let i=0;i<candidates.length;i+=4){await Promise.allSettled(candidates.slice(i,i+4).map(async c=>{const film=await verify(c.id,AbortSignal.any([signal,AbortSignal.timeout(5000)]),fetcher);fresh.push(film);remember(film);}));if(signal.aborted)break;}
  const success=fresh.length>0,prior=snapshot?.films||youtubeTitles;
  const unique=new Map<string,Film>();for(const f of [...fresh.sort((a,b)=>String(b.publishedAt||'').localeCompare(String(a.publishedAt||''))),...prior,...youtubeTitles])if(!unique.has(String(f.id)))unique.set(String(f.id),f);
  const films=[...unique.values()].slice(0,150);for(const seed of youtubeTitles)if(!films.some(f=>f.id===seed.id))films.push(unique.get(String(seed.id))||seed);
  snapshot={films,status:{mode:success?'live':'fallback',updatedAt:success?new Date(now).toISOString():snapshot?.status.updatedAt||null,nextRefreshAt:new Date(now+(success?TTL:RETRY)).toISOString(),channels:statuses}};
  return snapshot;
 })().finally(()=>{pending=undefined;});
 return pending;
}

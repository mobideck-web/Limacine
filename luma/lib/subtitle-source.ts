import {parseSubtitles,type SubtitleCue} from './subtitles';
export type CaptionRequest={id?:number;imdb?:string;type:'movie'|'tv';season:number;episode:number;language:'ar'|'en';track:number;refresh?:boolean};
export type CaptionTrack={index:number;label:string;language:string};
export type CaptionResponse={available:boolean;cues:SubtitleCue[];tracks:CaptionTrack[];selected?:number;label?:string;language:string;reason?:'unavailable'|'temporarily-unavailable';source:string};
type Fetcher=(input:string,init?:RequestInit)=>Promise<Response>;
const metadataCache=new Map<string,{at:number;data:unknown}>();
const captionCache=new Map<string,{at:number;cues:SubtitleCue[]}>();
export function allowedSubtitleUrl(value:unknown):value is string{
  if(typeof value!=='string')return false;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&(/^subs\d*\.strem\.io$/.test(u.hostname)||u.hostname==='cache.vdrk.site');}catch{return false;}
}
export function subtitleTracks(data:unknown,language:'ar'|'en'){
  const list=data&&typeof data==='object'&&Array.isArray((data as {subtitles?:unknown}).subtitles)?(data as {subtitles:unknown[]}).subtitles:[];
  const seen=new Set<string>();const result:{url:string;label:string;language:string}[]=[];
  for(const entry of list.slice(0,200)){
    if(!entry||typeof entry!=='object')continue;const s=entry as Record<string,unknown>,lang=String(s.lang||s.language||'').toLowerCase(),label=String(s.label||'');
    const matches=language==='ar'?/^(ar|ara)(-|$)/.test(lang)||/arabic|العربية/i.test(label):/^(en|eng)(-|$)/.test(lang)||/english/i.test(label);
    if(!matches||!allowedSubtitleUrl(s.url)||seen.has(s.url))continue;
    seen.add(s.url);result.push({url:s.url,label:label.slice(0,120)||(language==='ar'?'Arabic':'English'),language});
  }
  return result;
}
async function boundedText(response:Response){
  if(Number(response.headers.get('content-length'))>2_000_000)throw Error('Subtitle too large');
  if(!response.body)throw Error('No subtitle body');const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>2_000_000)throw Error('Subtitle too large');chunks.push(chunk.value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}return new TextDecoder().decode(bytes);
}
async function download(url:string,fetcher:Fetcher,deadline:AbortSignal){
  let target=url;for(let hop=0;hop<3;hop++){
    if(!allowedSubtitleUrl(target))throw Error('Unsupported subtitle host');
    const response=await fetcher(target,{redirect:'manual',signal:AbortSignal.any([deadline,AbortSignal.timeout(6000)]),headers:{Accept:'text/vtt, application/x-subrip, text/plain'}});
    if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');if(!location)throw Error('Invalid redirect');target=new URL(location,target).href;continue;}
    if(!response.ok)throw Error('Subtitle unavailable');return parseSubtitles(await boundedText(response));
  }throw Error('Too many subtitle redirects');
}
function matchesArabic(cues:SubtitleCue[]){if(cues.length<=10)return /[\u0600-\u06ff]/.test(cues.map(c=>c.text).join(' '));const sample=cues.slice(0,1000).map(c=>c.text).join(' '),arabic=(sample.match(/[\u0600-\u06ff]/g)||[]).length,latin=(sample.match(/[A-Za-z]/g)||[]).length;return arabic>=10&&arabic/Math.max(1,arabic+latin)>=.12;}
async function officialSubtitles(input:CaptionRequest,fetcher:Fetcher,deadline:AbortSignal):Promise<CaptionResponse|null>{
  if(!input.imdb||!/^tt\d{5,12}$/.test(input.imdb))return null;
  const id=input.type==='tv'?`${input.imdb}:${input.season}:${input.episode}`:input.imdb,url=`https://opensubtitles-v3.strem.io/subtitles/${input.type==='tv'?'series':'movie'}/${id}.json`,old=fetcher===fetch?metadataCache.get(url):undefined;
  try{
    let data:any;if(!input.refresh&&old&&Date.now()-old.at<20*60_000)data=old.data;else{const r=await fetcher(url,{signal:AbortSignal.any([deadline,AbortSignal.timeout(4500)]),headers:{Accept:'application/json'}});if(!r.ok)return null;data=await r.json();if(fetcher===fetch){if(metadataCache.size>=60)metadataCache.delete(metadataCache.keys().next().value!);metadataCache.set(url,{at:Date.now(),data});}}
    const files=(Array.isArray(data.subtitles)?data.subtitles:[]).filter((s:any)=>[input.language,input.language==='ar'?'ara':'eng'].includes(s.lang)&&allowedSubtitleUrl(s.url)&&!s.foreign_parts_only).slice(0,30);
    const tracks=files.map((s:any,index:number)=>({index,label:String(s.subtitleFileName||s.movieReleaseName||`Release ${index+1}`).slice(0,120),language:input.language}));
    const order=[input.track,...files.map((_:unknown,i:number)=>i).filter((i:number)=>i!==input.track)].filter(i=>files[i]).slice(0,2);
    for(const selected of order){try{const file=files[selected],cached=fetcher===fetch?captionCache.get(file.url):undefined,cues=!input.refresh&&cached&&Date.now()-cached.at<20*60_000?cached.cues:await download(file.url,fetcher,deadline);if(input.language==='ar'&&!matchesArabic(cues))continue;if(fetcher===fetch){if(captionCache.size>=20)captionCache.delete(captionCache.keys().next().value!);captionCache.set(file.url,{at:Date.now(),cues});}return {available:true,cues,tracks,selected,label:tracks[selected].label,language:input.language,source:'OpenSubtitles via Stremio'};}catch{}}
  }catch{}
  return null;
}
export async function loadSubtitles(input:CaptionRequest,fetcher:Fetcher=fetch):Promise<CaptionResponse>{
  const deadline=AbortSignal.timeout(22000),official=await officialSubtitles(input,fetcher,deadline);if(official)return official;
  const none=(reason:CaptionResponse['reason']):CaptionResponse=>({available:false,cues:[],tracks:[],language:input.language,reason,source:'FrameXTV subtitle catalog'});
  if(!input.id)return {...none('unavailable'),source:'OpenSubtitles via Stremio'};
  const q=new URLSearchParams({id:String(input.id),type:input.type});if(input.type==='tv'){q.set('season',String(input.season));q.set('episode',String(input.episode));}
  let hadCatalog=false,hadTracks=false,lastTracks:CaptionTrack[]=[];const attempted=new Set<string>();
  for(const origin of ['https://api.framextv.cc','https://api.framextv.xyz']){
    if(deadline.aborted)break;const key=`${origin}?${q}`,cached=fetcher===fetch?metadataCache.get(key):undefined;let data:unknown;
    if(!input.refresh&&cached&&Date.now()-cached.at<20*60_000)data=cached.data;
    else{
      try{const r=await fetcher(`${origin}/api/subtitles?${q}`,{signal:AbortSignal.any([deadline,AbortSignal.timeout(6500)]),headers:{Accept:'application/json'}});if(!r.ok)continue;const value=await r.json();if(!value||!Array.isArray(value.subtitles)||value.success===false)continue;data=value;}catch{continue;}
      if(fetcher===fetch){if(metadataCache.size>=60)metadataCache.delete(metadataCache.keys().next().value!);metadataCache.set(key,{at:Date.now(),data});}
    }
    hadCatalog=true;const matching=subtitleTracks(data,input.language),tracks=matching.map((s,index)=>({index,label:s.label,language:s.language}));
    if(!matching.length)continue;hadTracks=true;lastTracks=tracks;
    const order=[input.track,...matching.map((_,i)=>i).filter(i=>i!==input.track)].filter(i=>matching[i]).slice(0,3);
    for(const index of order){
      if(deadline.aborted)break;const selected=matching[index];if(attempted.has(selected.url))continue;attempted.add(selected.url);
      try{
        const old=fetcher===fetch?captionCache.get(selected.url):undefined;
        const cues=!input.refresh&&old&&Date.now()-old.at<20*60_000?old.cues:await download(selected.url,fetcher,deadline);
        if(input.language==='ar'&&!matchesArabic(cues))continue;
        if(fetcher===fetch){if(captionCache.size>=20)captionCache.delete(captionCache.keys().next().value!);captionCache.set(selected.url,{at:Date.now(),cues});}
        return {available:true,cues,tracks,selected:index,label:selected.label,language:input.language,source:'FrameXTV subtitle catalog'};
      }catch{}
    }
  }
  return {...none(hadCatalog&&!hadTracks?'unavailable':'temporarily-unavailable'),tracks:lastTracks};
}

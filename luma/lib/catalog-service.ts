import starter from './catalog.json';
import {specialtyTitles,youtubeTitles} from './collections';
import {type Film} from './types';
import {filterFilms,mergeFilms,matchScore,type CatalogFilters} from './search';
import {wikiSearch} from './wiki';
import {liveYouTube,cachedYouTube,knownYouTube,resolveYouTube,type YouTubeStatus} from './youtube-live';
type Json=Record<string,any>;
export type ProviderStatus=Record<string,'ok'|'unavailable'>;
const cache=new Map<string,{at:number;value:any}>();
const headers={'User-Agent':'LumaCinema/2.0 (personal cinema discovery; public catalog APIs)',Accept:'application/json'};
async function json(url:string,ttl=10*60_000):Promise<Json>{
 const old=cache.get(url);if(old&&Date.now()-old.at<ttl)return old.value;
 const r=await fetch(url,{headers,signal:AbortSignal.timeout(7500)});if(!r.ok)throw Error(`Provider ${r.status}`);
 if(Number(r.headers.get('content-length'))>3_000_000)throw Error('Catalog response too large');
 const reader=r.body?.getReader();if(!reader)throw Error('Empty response');let size=0;const chunks:Uint8Array[]=[];
 try{for(;;){const c=await reader.read();if(c.done)break;size+=c.value.length;if(size>3_000_000)throw Error('Catalog response too large');chunks.push(c.value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}const value=JSON.parse(new TextDecoder().decode(bytes));
 if(cache.size>=120)cache.delete(cache.keys().next().value!);cache.set(url,{at:Date.now(),value});return value;
}
function text(value:unknown){return String(Array.isArray(value)?value.join(', '):value||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').slice(0,3000);}
function year(value:unknown){const n=Number(String(value||'').match(/\d{4}/)?.[0]);return n>1800&&n<2200?n:undefined;}
function https(value:unknown,hosts:RegExp){try{const u=new URL(String(value));if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.port||!hosts.test(u.hostname))return undefined;u.protocol='https:';return u.href;}catch{return undefined;}}
export function cinemetaFilm(m:Json,type:'movie'|'tv'):Film|null{
 const imdb=String(m.imdb_id||m.id||'');if(!/^tt\d{5,12}$/.test(imdb)||!m.name)return null;const numeric=Number(m.moviedb_id),genres=Array.isArray(m.genres)?m.genres:Array.isArray(m.genre)?m.genre:[];
 return {id:Number.isSafeInteger(numeric)&&numeric>0?numeric:imdb,identity:Number.isSafeInteger(numeric)&&numeric>0?'tmdb':'imdb',tmdbId:Number.isSafeInteger(numeric)&&numeric>0?numeric:undefined,imdb,type,title:text(m.name),year:year(m.year||m.releaseInfo||m.released),genres,genre:genres[0],category:genres.includes('Documentary')?'documentary':'film',overview:text(m.description),runtime:text(m.runtime)||undefined,poster:https(m.poster,/^(?:images\.metahub\.space|image\.tmdb\.org|m\.media-amazon\.com)$/)||`https://images.metahub.space/poster/medium/${imdb}/img`,source:'Cinemeta',creditUrl:`https://www.imdb.com/title/${imdb}/`};
}
async function cinemeta(query:string,type:'movie'|'tv',page:number,documentary=false){const extra=query?`search=${encodeURIComponent(query)}`:documentary?'genre=Documentary':'';const parts=[extra,...(page>1?[`skip=${(page-1)*50}`]:[])].filter(Boolean).join('&');const data=await json(`https://v3-cinemeta.strem.io/catalog/${type==='tv'?'series':'movie'}/top${parts?'/'+parts:''}.json`);return (data.metas||[]).map((m:Json)=>cinemetaFilm(m,type)).filter(Boolean) as Film[];}
export function validArchiveLicense(value:unknown){return /^https?:\/\/(?:www\.)?creativecommons\.org\/(?:publicdomain\/(?:mark\/1\.0|zero\/1\.0)?|licenses\/(?:publicdomain|by(?:-sa|-nc|-nc-sa|-nd|-nc-nd)?\/\d\.\d))\/?$/i.test(String(value||''));}
export function archiveFilm(m:Json):Film|null{
 if(typeof m.identifier!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(m.identifier)||!m.title||!validArchiveLicense(m.licenseurl)||m.access_restricted||m.is_dark)return null;
 const subjects=text(m.subject),title=text(m.title);if(/\b(trailer|teaser|raw footage)\b/i.test(title))return null;
 return {id:m.identifier,identity:'archive',type:'movie',title,year:year(m.year||m.date),genre:/documentar/i.test(subjects)?'Documentary':'Classic',genres:[...new Set([/documentar/i.test(subjects)?'Documentary':'Classic',...['Comedy','Drama','Horror','Animation','Sci-Fi','Crime','History','Nature','Silent'].filter(g=>subjects.toLowerCase().includes(g.toLowerCase()))])],category:/documentar/i.test(subjects)?'documentary':'film',overview:text(m.description),poster:`https://archive.org/services/img/${encodeURIComponent(m.identifier)}`,source:'Internet Archive',creditUrl:`https://archive.org/details/${m.identifier}`,license:String(m.licenseurl),free:true};
}
async function archive(query:string,page:number,documentary=false){
 const escaped=query.replace(/[+\-!(){}\[\]^"~*?:\\/|&]/g,' ').trim();
 const q=`mediatype:movies AND ${documentary?'(collection:feature_films OR collection:documentary_films)':'collection:feature_films'} AND licenseurl:* AND (format:"h.264" OR format:"MPEG4" OR format:"512Kb MPEG4")${escaped?` AND (${escaped.split(/\s+/).map(w=>`title:${w}*`).join(' AND ')})`:''}${documentary?' AND (subject:documentary OR subject:documentaries OR title:documentary)':''}`;
 const p=new URLSearchParams({q,output:'json',rows:'50',page:String(page)});for(const f of ['identifier','title','year','date','description','subject','licenseurl','access_restricted'])p.append('fl[]',f);p.append('sort[]','downloads desc');const d=await json(`https://archive.org/advancedsearch.php?${p}`);if(!d.response)throw Error('Archive search unavailable');return Object.assign((d.response.docs||[]).map(archiveFilm).filter(Boolean) as Film[],{hasMore:d.response.numFound>page*50});
}
export async function catalogResults(query:string,filters:CatalogFilters,page=1,options:{refreshYouTube?:boolean}={}){
 let youtube:YouTubeStatus|undefined;
 const statuses:ProviderStatus={},jobs:{name:string;run:()=>Promise<Film[]>}[]=[],selected=filters.provider||'all',free=filters.free||selected==='archive'||selected==='youtube',documentary=filters.type==='documentary';
 if(!free&&!['anime','arabic'].includes(filters.type||'')&&(selected==='all'||selected==='cinemeta'))for(const type of filters.type==='tv'?['tv'] as const:filters.type==='movie'?['movie'] as const:['movie','tv'] as const)jobs.push({name:`Cinemeta ${type}`,run:()=>cinemeta(query,type,page,documentary)});
 if(query&&!free&&(selected==='all'||selected==='wikimedia'))jobs.push({name:'Wikimedia',run:()=>wikiSearch(query,/[\u0600-\u06ff]/.test(query)?'ar':'en')});
 if(!['tv','anime','arabic'].includes(filters.type||'')&&(selected==='all'||selected==='archive'))jobs.push({name:'Internet Archive',run:()=>archive(query,page,documentary)});
 if(filters.type!=='tv'&&(selected==='all'||selected==='youtube'))jobs.push({name:'YouTube',run:async()=>{if(page!==1)return [];let films=cachedYouTube();if(selected==='youtube'){const live=await liveYouTube({refresh:options.refreshYouTube});youtube=live.status;films=live.films;}return films.filter(f=>!query||matchScore(f,query)>0);}});
 if(!free&&(selected==='all'||selected==='cinemeta')&&['anime','arabic'].includes(filters.type||''))jobs.push({name:'Cinemeta collection',run:async()=>{if(page>1)return [];const titles=specialtyTitles.filter(f=>filters.type==='anime'?f.anime:f.audioLanguage==='ar');const enriched=await Promise.allSettled(titles.map(async f=>({...f,...await resolveTitle(f),anime:f.anime,audioLanguage:f.audioLanguage,arabicTitle:f.arabicTitle})));return enriched.map((r,i)=>r.status==='fulfilled'?r.value:titles[i]).filter(f=>!query||matchScore(f,query)>0);}});
 const settled=await Promise.allSettled(jobs.map(j=>j.run()));const films:Film[]=!free&&page===1&&selected==='all'?[...(starter as Film[]),...specialtyTitles].filter(f=>!query||matchScore(f,query)>0):[];
 let hasMore=false;settled.forEach((r,i)=>{statuses[jobs[i].name]=r.status==='fulfilled'?'ok':'unavailable';if(r.status==='fulfilled'){films.push(...r.value);if(r.value.length>=50||(r.value as Film[]&{hasMore?:boolean}).hasMore)hasMore=true;}});
 return {results:filterFilms(mergeFilms(films,query),filters),providerStatus:statuses,degraded:Object.values(statuses).some(v=>v==='unavailable')||youtube?.mode==='fallback',hasMore,page,source:'Luma catalogs',youtube};
}
export async function resolveTitle(film:Film){
 if(film.identity!=='imdb'||!/^tt\d{5,12}$/.test(String(film.id)))return film;
 const d=await json(`https://v3-cinemeta.strem.io/meta/${film.type==='tv'?'series':'movie'}/${film.id}.json`,24*3600_000),resolved=cinemetaFilm(d.meta||{},film.type)||film;
 if(resolved.identity==='imdb'){
  try{const matches=await wikiSearch(resolved.title,'en'),match=matches.find(f=>f.imdb===resolved.imdb&&f.type===resolved.type);if(match)return {...resolved,id:match.id,identity:'tmdb' as const,tmdbId:Number(match.id),arabicTitle:film.arabicTitle||match.arabicTitle,poster:resolved.poster||match.poster};}catch{}
 }
 return {...resolved,poster:resolved.poster||`https://images.metahub.space/poster/medium/${film.id}/img`};
}
export function validProviderId(provider:string,id:string){return provider==='archive'?/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(id):provider==='youtube'?!!knownYouTube(id):false;}
export async function resolveMedia(provider:string,id:string){
 if(provider==='nasa')throw Error('NASA has been removed from Luma');
 if(provider==='youtube'){const film=await resolveYouTube(id);return {film,url:`https://www.youtube.com/embed/${id}`,mode:'embed',provider:'YouTube',captions:[]};}
 if(!validProviderId(provider,id))throw Error('Invalid provider identifier');
 if(provider==='archive'){
  const d=await json(`https://archive.org/metadata/${encodeURIComponent(id)}`,5*60_000),film=archiveFilm({...d.metadata,identifier:id});if(!film||d.is_dark||d.metadata?.access_restricted)throw Error('This item is restricted or has no suitable license');
  const files=(d.files||[]).filter((f:Json)=>typeof f.name==='string'&&!f.private&&/\.mp4$/i.test(f.name)&&/h\.264|MPEG4/i.test(f.format||''));if(!files.length)throw Error('No browser-compatible movie file');
  files.sort((a:Json,b:Json)=>Number(/512kb/i.test(a.name))-Number(/512kb/i.test(b.name))||Number(a.size||0)-Number(b.size||0));const file=files[0];
  return {film,url:`https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(file.name)}`,duration:Number(file.length)||undefined,mode:'video',provider:'Internet Archive',captions:[]};
 }
 throw Error('Unsupported provider');
}

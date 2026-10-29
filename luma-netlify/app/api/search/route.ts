import catalog from '@/lib/catalog.json';
import type {Film} from '@/lib/types';
const cache=new Map<string,{time:number;results:Film[]}>();
async function json<T>(url:string):Promise<T>{const r=await fetch(url,{headers:{'User-Agent':'LumaCinema/1.0 (personal cinema discovery; Wikimedia public API)',Accept:'application/json'},signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error(`Catalog ${r.status}`);return r.json() as Promise<T>;}
type WikiPage={title:string;index?:number;pageprops?:{wikibase_item?:string};thumbnail?:{source?:string};extract?:string};
type Entity={labels?:Record<string,{value:string}>;descriptions?:Record<string,{value:string}>;claims?:Record<string,{mainsnak?:{datavalue?:{value?:unknown}}}[]>};
function value(e:Entity,p:string){return e.claims?.[p]?.[0]?.mainsnak?.datavalue?.value;}
async function wikiSearch(query:string,language:string):Promise<Film[]>{
 const p=new URLSearchParams({action:'query',format:'json',generator:'search',gsrsearch:query,gsrnamespace:'0',gsrlimit:'12',prop:'pageprops|pageimages',ppprop:'wikibase_item',piprop:'thumbnail',pilicense:'any',pithumbsize:'180'});
 const data=await json<{error?:unknown;query?:{pages?:Record<string,WikiPage>}}>(`https://${language}.wikipedia.org/w/api.php?${p}`);if(data.error)throw Error('Search unavailable');
 const pages=(Object.values(data.query?.pages||{}) as WikiPage[]).sort((a,b)=>(a.index||99)-(b.index||99));
 const matched=pages.filter(p=>/^Q\d+$/.test(p.pageprops?.wikibase_item||'')).slice(0,12);
 if(!matched.length)return [];
 const ep=new URLSearchParams({action:'wbgetentities',ids:matched.map(p=>p.pageprops!.wikibase_item!).join('|'),props:'claims|labels|descriptions',languages:'en|ar',format:'json'});
 const {entities,error}=await json<{entities?:Record<string,Entity>;error?:unknown}>(`https://www.wikidata.org/w/api.php?${ep}`);
 if(error||!entities)throw Error('Title matching unavailable');
 return matched.flatMap(page=>{
  const e=entities[page.pageprops!.wikibase_item!];if(!e)return [];
  const movieId=value(e,'P4947'),tvId=value(e,'P4983'),id=Number(tvId||movieId);if(!Number.isSafeInteger(id)||id<1)return [];
  const time=value(e,'P577') as {time?:string}|undefined,duration=value(e,'P2047') as {amount?:string}|undefined,minutes=Number(duration?.amount);
  return [{id,type:tvId?'tv':'movie',title:e.labels?.en?.value||page.title.replace(/\s*\([^)]*\)$/, ''),arabicTitle:e.labels?.ar?.value,year:time?.time?Number(time.time.match(/\d{4}/)?.[0]):undefined,overview:e.descriptions?.en?.value||page.extract?.slice(0,450),runtime:minutes>0&&minutes<1000?`${Math.floor(minutes/60)}h ${minutes%60}m`:tvId?'Series':undefined,poster:page.thumbnail?.source||null,imdb:String(value(e,'P345')||'')||undefined,source:'Wikimedia',creditUrl:`https://${language}.wikipedia.org/wiki/${encodeURIComponent(page.title)}`} as Film];
 });
}
export async function GET(request:Request){
 const query=new URL(request.url).searchParams.get('q')?.trim().slice(0,100)||'';if(query.length<2)return Response.json({results:[],source:'Wikimedia'});
 const key=query.toLocaleLowerCase(),local=(catalog as Film[]).filter(f=>`${f.title} ${f.arabicTitle||''}`.toLocaleLowerCase().includes(key)),cached=cache.get(key);
 if(cached&&Date.now()-cached.time<3600000)return Response.json({results:cached.results,source:'Wikimedia'},{headers:{'Cache-Control':'private, max-age=3600'}});
 try{const live=await wikiSearch(query,/[\u0600-\u06ff]/.test(query)?'ar':'en'),merged=new Map<string,Film>();for(const f of [...local,...live]){const id=`${f.type}-${f.id}`;if(!merged.has(id))merged.set(id,f);}const results=[...merged.values()];if(cache.size>100)cache.clear();cache.set(key,{time:Date.now(),results});return Response.json({results,source:'Wikimedia',note:'Catalog matches do not confirm playback or Arabic subtitles.'},{headers:{'Cache-Control':'private, max-age=3600'}});}
 catch{return Response.json({results:local,source:'starter catalog',degraded:true,note:'Live catalog is temporarily unavailable. Showing matches from the starter collection.'});}
}

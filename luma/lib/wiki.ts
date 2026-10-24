import type {Film} from './types';
async function json<T>(url:string):Promise<T>{const r=await fetch(url,{headers:{'User-Agent':'LumaCinema/1.0 (personal cinema discovery; Wikimedia public API)',Accept:'application/json'},signal:AbortSignal.timeout(6500)});if(!r.ok)throw Error(`Catalog ${r.status}`);return r.json() as Promise<T>;}
type WikiPage={title:string;index?:number;pageprops?:{wikibase_item?:string};thumbnail?:{source?:string};extract?:string};
type Entity={labels?:Record<string,{value:string}>;descriptions?:Record<string,{value:string}>;claims?:Record<string,{mainsnak?:{datavalue?:{value?:unknown}}}[]>};
function value(e:Entity,p:string){return e.claims?.[p]?.[0]?.mainsnak?.datavalue?.value;}
export async function wikiSearch(query:string,language:string):Promise<Film[]>{
 const p=new URLSearchParams({action:'query',format:'json',generator:'search',gsrsearch:query,gsrnamespace:'0',gsrlimit:'12',prop:'pageprops|pageimages|extracts',ppprop:'wikibase_item',piprop:'thumbnail',pilicense:'any',pithumbsize:'400',exintro:'1',explaintext:'1',exsentences:'2'});
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
  const languages=(e.claims?.P364||[]).map(c=>(c.mainsnak?.datavalue?.value as {id?:string})?.id);
  return [{audioLanguage:languages.includes('Q13955')?'ar':undefined,id,type:tvId?'tv':'movie',title:e.labels?.en?.value||page.title.replace(/\s*\([^)]*\)$/, ''),arabicTitle:e.labels?.ar?.value,year:time?.time?Number(time.time.match(/\d{4}/)?.[0]):undefined,overview:e.descriptions?.en?.value||page.extract?.slice(0,450),runtime:minutes>0&&minutes<1000?`${Math.floor(minutes/60)}h ${minutes%60}m`:tvId?'Series':undefined,poster:page.thumbnail?.source||null,imdb:String(value(e,'P345')||'')||undefined,source:'Wikimedia',creditUrl:`https://${language}.wikipedia.org/wiki/${encodeURIComponent(page.title)}`} as Film];
 });
}

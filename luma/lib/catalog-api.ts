import {apiJson} from '@/lib/api-response';
import {catalogResults} from './catalog-service';
import type {CatalogFilters} from './search';
export async function catalogResponse(request:Request,browse=false){
 const p=new URL(request.url).searchParams,q=(p.get('q')||'').trim().slice(0,100),type=p.get('type')||'all',provider=p.get('provider')||'all',page=Number(p.get('page')||1),year=p.has('year')?Number(p.get('year')):undefined;
 if(!['all','movie','tv','documentary','anime','arabic'].includes(type)||!['all','cinemeta','wikimedia','archive','youtube'].includes(provider)||!Number.isSafeInteger(page)||page<1||page>100||(year!==undefined&&(!Number.isSafeInteger(year)||year<1880||year>2100)))return apiJson({error:'Invalid catalog filters',results:[]},{status:400});
 if(!browse&&q.length<2)return apiJson({results:[],hasMore:false,providerStatus:{}});
 const refresh=provider==='youtube'&&p.get('refresh')==='1';
 const result=await catalogResults(q,{type,provider,year,free:p.get('free')==='1'} as CatalogFilters,page,{refreshYouTube:refresh});return apiJson(result,{headers:{'Cache-Control':result.degraded||refresh?'no-store':'public, max-age=300'}});
}

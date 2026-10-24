import {apiJson} from '@/lib/api-response';
const cache=new Map<string,{at:number;value:string}>();
export async function GET(request:Request){
  const q=new URL(request.url).searchParams,type=q.get('type'),id=q.get('id'),season=q.get('season'),episode=q.get('episode');
  if(!['movie','tv'].includes(type||'')||!/^\d{1,9}$/.test(id||'')||Number(id)<1)return apiJson({vidsrc:'unknown'},{status:400});
  if(type==='tv'&&(!/^\d{1,3}$/.test(season||'')||!/^\d{1,4}$/.test(episode||'')||Number(season)<1||Number(episode)<1))return apiJson({vidsrc:'unknown'},{status:400});
  const key=`${type}/${id}${type==='tv'?`/${season}/${episode}`:''}`,hit=cache.get(key);
  if(hit&&Date.now()-hit.at<300000)return apiJson({vidsrc:hit.value});
  try{
    const r=await fetch(`https://vidsrc.sh/info/${key}.json`,{signal:AbortSignal.timeout(3500),headers:{Accept:'application/json'}});
    const value=r.status===404?'unavailable':r.ok?'listed':'unknown';
    if(cache.size>150)cache.clear();if(value!=='unknown')cache.set(key,{at:Date.now(),value});
    return apiJson({vidsrc:value,note:'A catalog listing does not verify video playback or subtitles.'},{headers:{'Cache-Control':'public, max-age=120'}});
  }catch{return apiJson({vidsrc:'unknown'});}
}

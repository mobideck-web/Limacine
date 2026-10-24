'use client';
import {useEffect,useRef} from 'react';
import type {ProgressUpdate,SubtitleLanguage} from '@/lib/players';

type YPlayer={getCurrentTime:()=>number;getDuration:()=>number;getPlayerState:()=>number;seekTo:(time:number,allowSeekAhead:boolean)=>void;destroy:()=>void;setOption:(module:string,option:string,value:unknown)=>void};
type YApi={Player:new(element:HTMLIFrameElement,options:{events:{onReady:()=>void;onError:()=>void}})=>YPlayer};
let api:Promise<YApi>|undefined;
function loadApi(){return api??=new Promise<YApi>((resolve,reject)=>{const w=window as Window&{YT?:YApi;onYouTubeIframeAPIReady?:()=>void};if(w.YT?.Player){resolve(w.YT);return;}const prior=w.onYouTubeIframeAPIReady;w.onYouTubeIframeAPIReady=()=>{prior?.();if(w.YT)resolve(w.YT);};const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{api=undefined;reject(Error('YouTube unavailable'));};document.head.appendChild(script);});}
export function YouTubePlayer({id,title,resume,language,onProgress,onError}:{id:string;title:string;resume:number;language:SubtitleLanguage;onProgress:(p:ProgressUpdate)=>void;onError:()=>void}){
 const frame=useRef<HTMLIFrameElement>(null),player=useRef<YPlayer|null>(null),callbacks=useRef({onProgress,onError});callbacks.current={onProgress,onError};
 const start=useRef(Math.max(0,Math.floor(resume))),initial=useRef(language);
 useEffect(()=>{let disposed=false,timer:ReturnType<typeof setInterval>|undefined;loadApi().then(YT=>{if(disposed||!frame.current)return;player.current=new YT.Player(frame.current,{events:{onReady:()=>{if(disposed)return;timer=setInterval(()=>{const p=player.current;if(!p)return;const state=p.getPlayerState(),time=p.getCurrentTime(),duration=p.getDuration();if(!Number.isFinite(time)||!Number.isFinite(duration)||duration<=0)return;callbacks.current.onProgress({time,duration,state:state===0?'ended':state===1?'playing':'paused',season:1,episode:1});},500);},onError:()=>callbacks.current.onError()}});}).catch(()=>{if(!disposed)callbacks.current.onError();});return()=>{disposed=true;if(timer)clearInterval(timer);player.current?.destroy();player.current=null;};},[id]);
 useEffect(()=>{player.current?.setOption('captions','track',language==='off'?{}:{languageCode:language});},[language]);
 const q=new URLSearchParams({enablejsapi:'1',origin:typeof window==='undefined'?'':window.location.origin,autoplay:'1',playsinline:'1',cc_load_policy:initial.current==='off'?'0':'1',cc_lang_pref:initial.current==='en'?'en':'ar',hl:'ar',start:String(start.current)});
 return <div className="youtube-host"><iframe ref={frame} title={`${title} — official YouTube player`} src={`https://www.youtube.com/embed/${id}?${q}`} sandbox="allow-scripts allow-same-origin allow-presentation" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; presentation" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div>;
}

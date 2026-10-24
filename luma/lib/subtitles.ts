export type SubtitleCue={start:number;end:number;text:string};
function timestamp(raw:string){const s=raw.trim().replace(',','.');if(!/^(?:\d{1,3}:)?\d{2}:\d{2}\.\d{1,3}$/.test(s))return NaN;const parts=s.split(':').map(Number);return parts.length===3?parts[0]*3600+parts[1]*60+parts[2]:parts[0]*60+parts[1];}
export function parseSubtitles(input:string):SubtitleCue[]{
  if(input.length>2_000_000)throw Error('Choose a subtitle file smaller than 2 MB.');
  const cues:SubtitleCue[]=[];
  for(const block of input.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split(/\n\s*\n/)){
    const lines=block.split('\n');if(/^(NOTE|STYLE|REGION)(\s|$)/.test(lines[0]))continue;
    const index=lines.findIndex(line=>line.includes('-->'));if(index<0)continue;
    const match=lines[index].match(/^\s*(\S+)\s+-->\s+(\S+)/);if(!match)continue;
    const start=timestamp(match[1]),end=timestamp(match[2]);
    const text=lines.slice(index+1).join('\n').replace(/<[^>]*>/g,'').replace(/\{\\[^}]*\}/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').trim();
    if(Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end>start&&text)cues.push({start,end,text});
    if(cues.length>20000)throw Error('This subtitle file contains too many captions.');
  }
  if(!cues.length)throw Error('No readable captions found. Choose an SRT or WebVTT file.');
  return cues.sort((a,b)=>a.start-b.start);
}
export function captionAt(cues:SubtitleCue[],time:number,delay=0){
  const at=time-delay;let lo=0,hi=cues.length;
  while(lo<hi){const mid=(lo+hi)>>>1;if(cues[mid].start<=at)lo=mid+1;else hi=mid;}
  const result:string[]=[];for(let i=lo-1;i>=Math.max(0,lo-30);i--)if(cues[i].end>at)result.unshift(cues[i].text);
  return result.join('\n');
}

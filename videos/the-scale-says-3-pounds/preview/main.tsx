import React, {useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, PlayerRef} from '@remotion/player';
import Video from '../TheScaleSaysThreePounds';
import source from '../TheScaleSaysThreePounds.tsx?raw';
const beats = [['The morning after',0],['The calorie test',89],['Follow the weight',290],['Water',365],['Stored fuel',483],['Food in transit',725],['Weight ≠ fat',900],['Everything together',982],['Zoom out',1217]] as const;
function App(){
 const ref=useRef<PlayerRef>(null);
 const [copied,setCopied]=useState(false);
 return <main style={{minHeight:'100vh',background:'#24221e',color:'#efe6d3',fontFamily:'Arial, sans-serif',display:'flex',flexWrap:'wrap',justifyContent:'center',gap:44,padding:'32px 22px',boxSizing:'border-box'}}>
 <section style={{width:'min(100%, 440px)'}}><Player ref={ref} component={Video} durationInFrames={1344} fps={30} compositionWidth={1080} compositionHeight={1920} initialFrame={Math.max(0,Math.min(1343,Number(new URLSearchParams(location.search).get("frame"))||0))} controls clickToPlay doubleClickToFullscreen showVolumeControls style={{width:'100%',boxShadow:'0 18px 70px #0006'}}/></section>
 <aside style={{width:300,paddingTop:16}}><div style={{color:'#e1ad3c',fontSize:11,letterSpacing:3,fontWeight:700}}>VOX / EDITORIAL CUT 01</div><h1 style={{fontFamily:'Georgia,serif',fontSize:43,lineHeight:1.04,letterSpacing:-1}}>The scale<br/>says +3 pounds.</h1><p style={{color:'#b9ae9a',fontSize:14,lineHeight:1.7}}>44.8 seconds · 1080 × 1920 · 30 fps<br/>Original voiceover. Eleven fresh stock clips.<br/>Custom SVG. Paper-and-ink motion.</p><div style={{borderTop:'1px solid #514b40',marginTop:26}}>{beats.map(([label,frame],i)=><button key={frame} onClick={()=>ref.current?.seekTo(frame)} style={{display:'flex',gap:16,width:'100%',background:'none',color:'#efe6d3',border:0,borderBottom:'1px solid #514b40',padding:'14px 0',textAlign:'left',cursor:'pointer'}}><span style={{color:'#ad9879',fontVariantNumeric:'tabular-nums'}}>{(frame/30).toFixed(1).padStart(4,'0')}s</span><span>{label}</span></button>)}</div><button onClick={async()=>{await navigator.clipboard.writeText(source);setCopied(true)}} style={{width:'100%',marginTop:24,padding:14,background:'#e1ad3c',border:0,color:'#24221e',fontWeight:700,cursor:'pointer'}}>{copied?'Composition copied':'Copy complete Remotion composition'}</button><p style={{fontSize:12,color:'#ad9879',lineHeight:1.6}}>Footage is streamed from your project’s permanent asset URLs. Playback needs access to the asset hub.</p></aside>
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);

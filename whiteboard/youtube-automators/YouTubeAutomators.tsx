/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 1554, "width": 1080, "height": 1920 } */
import React from 'react';
import {AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

// Quick controls for the final mix.
const SHOW_CAPTIONS = true;
const PENCIL_CLIP_VOLUME = 0.03;
const MUSIC_BASE_VOLUME = 0.055;
const FPS = 30;
const asset = (id:string) => `https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=${id}`;
const at = (seconds:number) => Math.round(seconds*FPS);
const clamp = {extrapolateLeft:'clamp' as const, extrapolateRight:'clamp' as const};
const ramp = (frame:number,begin:number,end:number) => interpolate(frame,[begin,end],[0,1],clamp);
const C={ink:'#22272a',muted:'#75817d',blue:'#b6d9e8',gold:'#efbb5a',sage:'#abc5a5',paper:'#fff',line:'#e0e8e4'};
const FONT='Inter, Arial, sans-serif';
const VOICE='9215b4ce-d6c4-4507-9071-77de8620d315';
const MUSIC='f4a1ed94-671d-4de6-ba60-43370bfafe68';
const WHOOSH='8000d709-85ee-4aa4-aad0-9fc84130d93b';
const POP='c52d697f-f404-484e-881d-0349bc9d3b69';
const CLICK='b4bb2b99-a6c9-42f3-b3d6-816cca355aad';
const CHIME='e0021584-0f5b-4f03-9847-7798617996d4';
type Word={w:string;s:number};
// Timings are the original project's AssemblyAI word starts.
const WORDS:Word[]=[{"w":"Right","s":0.256},{"w":"now,","s":0.432},{"w":"everyone","s":0.817},{"w":"and","s":1.138},{"w":"their","s":1.234},{"w":"dad","s":1.458},{"w":"is","s":1.875},{"w":"using","s":1.955},{"w":"the","s":2.276},{"w":"exact","s":2.356},{"w":"same","s":2.773},{"w":"AI","s":3.141},{"w":"video","s":3.382},{"w":"tools,","s":3.702},{"w":"the","s":4.36},{"w":"same","s":4.44},{"w":"stock","s":4.68},{"w":"clips,","s":5.065},{"w":"and","s":5.482},{"w":"the","s":5.546},{"w":"same","s":5.626},{"w":"robotic","s":5.947},{"w":"templates.","s":6.363},{"w":"And","s":7.325},{"w":"because","s":7.405},{"w":"every","s":7.806},{"w":"video","s":8.047},{"w":"looks","s":8.287},{"w":"identical,","s":8.608},{"w":"viewers","s":9.794},{"w":"scroll","s":10.05},{"w":"past","s":10.435},{"w":"in","s":10.772},{"w":"2","s":10.932},{"w":"seconds.","s":11.173},{"w":"Look","s":12.295},{"w":"at","s":12.455},{"w":"what","s":12.519},{"w":"your","s":12.599},{"w":"brain","s":12.695},{"w":"is","s":12.936},{"w":"doing","s":13.016},{"w":"right","s":13.321},{"w":"now","s":13.497},{"w":"instead.","s":13.737},{"w":"You","s":14.539},{"w":"stop","s":14.715},{"w":"scrolling","s":15.02},{"w":"because","s":15.581},{"w":"watching","s":15.901},{"w":"an","s":16.222},{"w":"idea","s":16.302},{"w":"get","s":16.623},{"w":"hand-drawn","s":16.927},{"w":"step","s":17.585},{"w":"by","s":17.985},{"w":"step","s":18.082},{"w":"on","s":18.45},{"w":"a","s":18.546},{"w":"whiteboard","s":18.627},{"w":"feels","s":19.572},{"w":"fresh,","s":20.053},{"w":"human,","s":20.646},{"w":"and","s":21.272},{"w":"keeps","s":21.432},{"w":"your","s":21.656},{"w":"eyes","s":21.897},{"w":"locked","s":22.073},{"w":"on","s":22.458},{"w":"the","s":22.554},{"w":"screen","s":22.634},{"w":"until","s":23.035},{"w":"the","s":23.259},{"w":"picture","s":23.355},{"w":"is","s":23.66},{"w":"finished.","s":23.756},{"w":"While","s":25.039},{"w":"building","s":25.183},{"w":"my","s":25.439},{"w":"own","s":25.584},{"w":"software,","s":25.68},{"w":"I","s":26.305},{"w":"created","s":26.401},{"w":"an","s":26.818},{"w":"internal","s":26.946},{"w":"pipeline","s":27.443},{"w":"that","s":27.988},{"w":"turns","s":28.1},{"w":"any","s":28.565},{"w":"topic,","s":28.79},{"w":"script,","s":29.19},{"w":"or","s":29.671},{"w":"offer","s":29.912},{"w":"into","s":30.553},{"w":"custom","s":30.729},{"w":"hand-drawn","s":31.21},{"w":"whiteboard","s":31.9},{"w":"videos","s":32.253},{"w":"just","s":32.656},{"w":"like","s":32.816},{"w":"this","s":33.042},{"w":"one,","s":33.202},{"w":"from","s":33.701},{"w":"short","s":34.007},{"w":"reels","s":34.344},{"w":"to","s":34.747},{"w":"full","s":34.907},{"w":"10-minute","s":35.229},{"w":"YouTube","s":35.776},{"w":"explainers.","s":36.049},{"w":"Since","s":37.401},{"w":"rent","s":37.867},{"w":"is","s":38.124},{"w":"due","s":38.269},{"w":"this","s":38.366},{"w":"week","s":38.591},{"w":"and","s":38.993},{"w":"my","s":39.17},{"w":"SaaS","s":39.347},{"w":"isn't","s":39.797},{"w":"paying","s":39.974},{"w":"the","s":40.216},{"w":"bills","s":40.296},{"w":"yet,","s":40.553},{"w":"I'm","s":41.165},{"w":"cooking","s":41.325},{"w":"up","s":41.647},{"w":"custom","s":41.744},{"w":"videos","s":42.065},{"w":"and","s":42.548},{"w":"full","s":42.693},{"w":"monthly","s":42.886},{"w":"batches","s":43.272},{"w":"for","s":43.674},{"w":"people","s":43.754},{"w":"in","s":44.012},{"w":"here","s":44.221},{"w":"with","s":44.719},{"w":"same-day","s":44.816},{"w":"turnaround","s":45.282},{"w":"for","s":45.829},{"w":"dirt","s":46.07},{"w":"cheap.","s":46.247},{"w":"Drop","s":47.196},{"w":"a","s":47.373},{"w":"comment","s":47.438},{"w":"or","s":47.92},{"w":"shoot","s":48.017},{"w":"me","s":48.242},{"w":"a","s":48.338},{"w":"DM","s":48.355},{"w":"and","s":48.741},{"w":"let's","s":48.885},{"w":"make","s":49.046},{"w":"something","s":49.143},{"w":"for","s":49.448},{"w":"your","s":49.529},{"w":"channel","s":49.69},{"w":"or","s":49.947},{"w":"business.","s":50.027}];
const groups=Array.from({length:Math.ceil(WORDS.length/4)},(_,i)=>WORDS.slice(i*4,i*4+4));

// The source images are not referenced here. Each ready MP4 plays to its
// color hold at a speed calculated from its verified duration.
const scenes=[
 {from:0,to:6.83,id:'b20d8352-5581-44a5-a4ed-9fc0894a8403',duration:7.60},
 {from:6.83,to:12.20,id:'2951215d-ede9-466e-98b8-b6ba7a6a74f1',duration:8.08},
 {from:12.20,to:16.93,id:'4f557618-14a4-4498-b8fe-6aa27210a8af',duration:9.74},
 {from:16.93,to:20.65,id:'fb35e6bc-c36f-41bf-8c7c-52be7783dbbb',duration:5.05},
 {from:20.65,to:24.94,id:'42d30725-51f5-46f7-8184-a81b7f7f169a',duration:6.75},
 {from:24.94,to:28.20,id:'44e22b7c-fd93-440d-a3d1-9ef55406dde1',duration:9.15},
 {from:28.20,to:33.70,id:'601d8ab4-71de-4bae-9d9b-4bdedb2cd683',duration:7.33},
 {from:33.70,to:37.30,id:'f8cb0c2d-266a-436d-9997-ba3636e2dbb3',duration:6.92},
 {from:37.30,to:41.16,id:'3ab81db9-b1d5-4539-b7bf-61da66edd497',duration:7.05},
];
function Drawing({scene}:{scene:typeof scenes[number]}){
 const durationFrames=at(scene.to)-at(scene.from);
 const playbackRate=(scene.duration-.08)/(durationFrames/FPS);
 return <AbsoluteFill style={{backgroundColor:C.paper}}><OffthreadVideo src={asset(scene.id)} playbackRate={playbackRate} volume={PENCIL_CLIP_VOLUME} style={{width:'100%',height:'100%',objectFit:'cover'}}/></AbsoluteFill>;
}
function Rise({children,delay=0,style={}}:{children:React.ReactNode;delay?:number;style?:React.CSSProperties}){
 const f=useCurrentFrame();const p=ramp(f,delay,delay+12);
 return <div style={{opacity:p,transform:`translateY(${(1-p)*26}px)`,...style}}>{children}</div>;
}
const softCard:React.CSSProperties={background:'#fff',border:'2px solid #dce5df',borderRadius:22,boxShadow:'0 10px 34px rgba(29,54,45,.07)'};
function Label({children}:{children:React.ReactNode}){return <div style={{fontSize:24,fontWeight:900,letterSpacing:3,color:'#6c8177',fontFamily:FONT}}>{children}</div>}
function ProductionOffer(){
 const f=useCurrentFrame();
 const cards=[{label:'CUSTOM VIDEOS',sub:'Built for your idea',color:C.blue,delay:20},{label:'MONTHLY BATCHES',sub:'A repeatable channel',color:C.sage,delay:55}];
 return <AbsoluteFill style={{background:'#fcfdfb',fontFamily:FONT,color:C.ink}}>
  <Rise delay={0} style={{position:'absolute',top:220,left:76,right:76}}><Label>THE OFFER</Label><div style={{fontSize:77,fontWeight:900,letterSpacing:-3.8,lineHeight:1.03,marginTop:24}}>Make ideas<br/><span style={{color:'#4c8b75'}}>worth watching.</span></div></Rise>
  <div style={{position:'absolute',top:505,left:76,right:76,display:'flex',flexDirection:'column',gap:18}}>{cards.map((c,i)=><Rise delay={c.delay} key={c.label}><div style={{...softCard,padding:'25px 28px',display:'flex',alignItems:'center',gap:24}}><div style={{width:i===0?92:104,height:70,borderRadius:12,background:c.color,display:'grid',placeItems:'center',fontSize:30,color:C.ink,flexShrink:0}}>{i===0?'▶':'▤'}</div><div><div style={{fontSize:29,fontWeight:900,letterSpacing:.4}}>{c.label}</div><div style={{fontSize:22,color:C.muted,marginTop:6}}>{c.sub}</div></div></div></Rise>)}</div>
  <Rise delay={108} style={{position:'absolute',top:1030,left:76,right:76}}><div style={{background:C.ink,borderRadius:22,padding:'29px 34px',display:'flex',alignItems:'center',justifyContent:'space-between',color:'#fff'}}><div style={{fontSize:22,fontWeight:900,letterSpacing:2}}>TURNAROUND</div><div style={{fontSize:40,fontWeight:900,color:C.gold}}>SAME DAY</div></div></Rise>
  <div style={{position:'absolute',top:1200,left:76,right:76,height:6,borderRadius:10,background:'#e8ede9'}}><div style={{height:'100%',width:`${ramp(f,108,139)*100}%`,background:C.gold,borderRadius:10}}/></div>
 </AbsoluteFill>;
}
function Outro(){
 return <AbsoluteFill style={{background:'#fbfdfb',fontFamily:FONT,color:C.ink}}>
  <Rise delay={0} style={{position:'absolute',top:220,left:78,right:78}}><Label>YOUR CHANNEL. YOUR IDEA.</Label><div style={{fontSize:79,fontWeight:900,letterSpacing:-4,lineHeight:1.03,marginTop:28}}>Let's make<br/><span style={{color:'#4c8b75'}}>something</span><br/>worth watching.</div></Rise>
  <Rise delay={12} style={{position:'absolute',top:800,left:78,right:78}}><div style={{...softCard,padding:'32px 34px',display:'flex',alignItems:'center',gap:24}}><div style={{width:72,height:72,borderRadius:18,background:C.gold,display:'grid',placeItems:'center',fontSize:36,fontWeight:900}}>↗</div><div><div style={{fontSize:34,fontWeight:900}}>COMMENT OR DM</div><div style={{fontSize:23,color:C.muted,marginTop:8}}>Let's build for your channel or business</div></div></div></Rise>
  <Rise delay={38} style={{position:'absolute',top:1100,left:78,right:78}}><div style={{display:'flex',alignItems:'center',gap:12}}>{[C.blue,C.gold,C.sage].map((color,i)=><div key={i} style={{width:42,height:7,borderRadius:5,background:color}}/>)}<span style={{fontWeight:800,fontSize:21,letterSpacing:2,color:'#758780',marginLeft:12}}>DRAWN TO BE DIFFERENT</span></div></Rise>
 </AbsoluteFill>;
}
function Captions(){
 const t=useCurrentFrame()/FPS;if(!SHOW_CAPTIONS)return null;
 const idx=groups.findIndex((g,i)=>t>=g[0].s-.02 && t<Math.min((groups[i+1]?.[0].s??50.45)-.01,g[g.length-1].s+.9));
 if(idx<0)return null;const group=groups[idx];let active=0;group.forEach((word,i)=>{if(t>=word.s-.02)active=i});
 return <div style={{position:'absolute',bottom:300,left:64,right:64,display:'flex',justifyContent:'center',fontFamily:FONT,pointerEvents:'none'}}><div style={{background:'rgba(31,39,40,.95)',padding:'15px 24px',borderRadius:17,display:'flex',gap:'4px 10px',justifyContent:'center',flexWrap:'wrap',maxWidth:920}}>{group.map((word,i)=><span key={i} style={{fontSize:52,fontWeight:900,lineHeight:1.18,letterSpacing:-1,color:i===active?'#ffe091':'white'}}>{word.w}</span>)}</div></div>;
}
function Progress(){const f=useCurrentFrame();const {durationInFrames}=useVideoConfig();return <div style={{position:'absolute',top:0,left:0,right:0,height:7,background:'#eef1ee'}}><div style={{height:'100%',width:`${f/(durationInFrames-1)*100}%`,background:C.gold}}/></div>}
const cues=[{t:6.83,id:WHOOSH,v:.08},{t:12.2,id:POP,v:.09},{t:16.93,id:WHOOSH,v:.08},{t:20.65,id:POP,v:.09},{t:24.94,id:WHOOSH,v:.08},{t:28.2,id:WHOOSH,v:.08},{t:33.7,id:POP,v:.09},{t:37.3,id:WHOOSH,v:.08},{t:41.16,id:WHOOSH,v:.09},{t:41.84,id:POP,v:.09},{t:43.00,id:CLICK,v:.08},{t:44.82,id:CHIME,v:.10},{t:47.1,id:WHOOSH,v:.09},{t:48.36,id:CLICK,v:.08}];
export default function YouTubeAutomators(){
 return <AbsoluteFill style={{background:'white'}}>
  {scenes.map(s=><Sequence key={s.id} from={at(s.from)} durationInFrames={at(s.to)-at(s.from)}><Drawing scene={s}/></Sequence>)}
  <Sequence from={at(41.16)} durationInFrames={at(47.1)-at(41.16)}><ProductionOffer/></Sequence>
  <Sequence from={at(47.1)} durationInFrames={at(51.8)-at(47.1)}><Outro/></Sequence>
  <Audio src={asset(VOICE)} volume={1}/>
  <Audio src={asset(MUSIC)} volume={f=>MUSIC_BASE_VOLUME*interpolate(f,[0,22,1460,1553],[0,1,1,0],clamp)}/>
  {cues.map((c,i)=><Sequence key={i} from={at(c.t)}><Audio src={asset(c.id)} volume={c.v}/></Sequence>)}
  <Captions/><Progress/>
 </AbsoluteFill>;
}

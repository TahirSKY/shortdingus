/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 1620, "width": 1080, "height": 1920 } */
import React from 'react';
import {AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

// Quick mix and accessibility controls.
const SHOW_CAPTIONS = true;
const PENCIL_CLIP_VOLUME = 0.03;
const MUSIC_BASE_VOLUME = 0.06;
const FPS = 30;
const asset = (id: string) => `https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=${id}`;
const VOICE = '9fbbd7ac-373f-4f8b-a768-e5f1236c9b0e';
const MUSIC = 'f4a1ed94-671d-4de6-ba60-43370bfafe68';
const WHOOSH = '8000d709-85ee-4aa4-aad0-9fc84130d93b';
const POP = 'c52d697f-f404-484e-881d-0349bc9d3b69';
const CLICK = 'b4bb2b99-a6c9-42f3-b3d6-816cca355aad';
const CHIME = 'e0021584-0f5b-4f03-9847-7798617996d4';
const palette = {ink:'#1e2930', muted:'#607078', mint:'#84E4B8', yellow:'#FFD45E', blue:'#7CC8F8', coral:'#FF8E7A', lavender:'#C9AEFF', white:'#FFFFFF'};
const font = 'Inter, Arial, sans-serif';
const ease = (frame:number, a:number, b:number) => interpolate(frame, [a,b], [0,1], {extrapolateLeft:'clamp',extrapolateRight:'clamp'});
const frameAt = (s:number) => Math.round(s * FPS);

type Word = {w:string;s:number};
const WORDS:Word[] = [{"w":"Let's","s":0.176},{"w":"be","s":0.352},{"w":"honest,","s":0.513},{"w":"almost","s":0.978},{"w":"every","s":1.314},{"w":"video","s":1.619},{"w":"on","s":1.94},{"w":"your","s":2.02},{"w":"feed","s":2.116},{"w":"right","s":2.34},{"w":"now","s":2.453},{"w":"is","s":2.757},{"w":"either","s":2.901},{"w":"the","s":3.078},{"w":"exact","s":3.222},{"w":"same","s":3.719},{"w":"talking","s":3.96},{"w":"head","s":4.425},{"w":"clip","s":4.585},{"w":"with","s":4.761},{"w":"flashing","s":4.922},{"w":"captions","s":5.242},{"w":"or","s":6.1},{"w":"cheap","s":6.204},{"w":"AI","s":6.589},{"w":"slop","s":6.781},{"w":"that","s":7.23},{"w":"everybody","s":7.407},{"w":"scrolls","s":7.727},{"w":"past","s":8.048},{"w":"in","s":8.289},{"w":"2","s":8.433},{"w":"seconds.","s":8.609},{"w":"Look","s":9.796},{"w":"at","s":9.892},{"w":"what","s":9.956},{"w":"your","s":10.052},{"w":"brain","s":10.132},{"w":"is","s":10.309},{"w":"doing","s":10.389},{"w":"right","s":10.613},{"w":"now","s":10.774},{"w":"instead.","s":10.934},{"w":"You","s":11.8},{"w":"stop","s":11.88},{"w":"scrolling","s":12.217},{"w":"because","s":12.698},{"w":"there","s":13.082},{"w":"is","s":13.195},{"w":"something","s":13.275},{"w":"weirdly","s":13.804},{"w":"addictive","s":14.221},{"w":"about","s":14.718},{"w":"watching","s":15.006},{"w":"an","s":15.327},{"w":"idea","s":15.407},{"w":"get","s":15.808},{"w":"drawn","s":15.984},{"w":"out","s":16.305},{"w":"step","s":16.53},{"w":"by","s":16.93},{"w":"step","s":17.027},{"w":"on","s":17.411},{"w":"a","s":17.492},{"w":"whiteboard.","s":17.572},{"w":"While","s":18.87},{"w":"building","s":19.031},{"w":"my","s":19.271},{"w":"own","s":19.432},{"w":"apps,","s":19.576},{"w":"I","s":19.913},{"w":"hated","s":20.137},{"w":"filming","s":20.538},{"w":"myself","s":20.794},{"w":"on","s":21.115},{"w":"camera,","s":21.259},{"w":"so","s":21.548},{"w":"I","s":21.837},{"w":"built","s":21.917},{"w":"an","s":22.141},{"w":"internal","s":22.237},{"w":"pipeline","s":22.638},{"w":"that","s":23.103},{"w":"turns","s":23.263},{"w":"any","s":23.504},{"w":"complex","s":23.744},{"w":"offer,","s":24.306},{"w":"topic,","s":24.883},{"w":"or","s":25.284},{"w":"article","s":25.444},{"w":"into","s":25.765},{"w":"a","s":25.925},{"w":"clean,","s":25.989},{"w":"hand-drawn","s":26.47},{"w":"whiteboard","s":27.192},{"w":"video","s":27.608},{"w":"just","s":28.073},{"w":"like","s":28.234},{"w":"this","s":28.346},{"w":"one.","s":28.554},{"w":"It","s":29.276},{"w":"makes","s":29.308},{"w":"complicated","s":29.533},{"w":"stuff","s":30.08},{"w":"dead","s":30.497},{"w":"simple","s":30.738},{"w":"to","s":31.044},{"w":"understand,","s":31.14},{"w":"builds","s":31.943},{"w":"instant","s":32.345},{"w":"authority,","s":32.666},{"w":"and","s":33.373},{"w":"neither","s":33.55},{"w":"you","s":33.872},{"w":"nor","s":34.048},{"w":"your","s":34.273},{"w":"clients","s":34.418},{"w":"ever","s":34.98},{"w":"have","s":35.141},{"w":"to","s":35.253},{"w":"step","s":35.334},{"w":"in","s":35.575},{"w":"front","s":35.639},{"w":"of","s":35.8},{"w":"a","s":35.88},{"w":"camera.","s":35.944},{"w":"Since","s":37.149},{"w":"my","s":37.39},{"w":"own","s":37.551},{"w":"SaaS","s":37.663},{"w":"isn't","s":37.985},{"w":"paying","s":38.194},{"w":"the","s":38.354},{"w":"bills","s":38.435},{"w":"yet","s":38.676},{"w":"and","s":38.917},{"w":"rent","s":39.559},{"w":"is","s":39.816},{"w":"due","s":39.961},{"w":"this","s":40.057},{"w":"week,","s":40.218},{"w":"I'm","s":40.797},{"w":"running","s":40.941},{"w":"this","s":41.166},{"w":"engine","s":41.327},{"w":"manually","s":41.568},{"w":"for","s":41.986},{"w":"founders","s":42.13},{"w":"and","s":42.532},{"w":"agencies","s":42.628},{"w":"in","s":43.03},{"w":"here","s":43.174},{"w":"for","s":43.415},{"w":"dirt","s":43.833},{"w":"cheap.","s":44.058},{"w":"I","s":44.878},{"w":"handle","s":44.942},{"w":"the","s":45.183},{"w":"research,","s":45.263},{"w":"script,","s":45.777},{"w":"voiceover,","s":46.404},{"w":"and","s":46.95},{"w":"animation","s":47.127},{"w":"in","s":47.609},{"w":"48","s":47.754},{"w":"hours.","s":48.236},{"w":"Drop","s":49.28},{"w":"a","s":49.441},{"w":"comment","s":49.457},{"w":"or","s":49.923},{"w":"shoot","s":50.421},{"w":"me","s":50.582},{"w":"a","s":50.678},{"w":"DM","s":50.742},{"w":"and","s":51.064},{"w":"let's","s":51.208},{"w":"cook","s":51.369},{"w":"up","s":51.546},{"w":"a","s":51.626},{"w":"batch","s":51.706},{"w":"for","s":51.947},{"w":"your","s":52.044},{"w":"brand","s":52.124},{"w":"or","s":52.365},{"w":"your","s":52.413},{"w":"clients.","s":52.51}];
// Starts from the project's AssemblyAI word alignment, grouped into compact phrases.
const GROUPS = Array.from({length: Math.ceil(WORDS.length/4)}, (_,i) => WORDS.slice(i*4,i*4+4));

const sceneData = [
  {from:0,to:9.7,id:'e9b1b26c-3f91-4915-b3dd-0f98b378f0c1',length:8.33,label:'THE FEED IS FULL OF THE SAME',color:palette.coral},
  {from:9.7,to:13.1,id:'ac3be313-ebfb-4150-bbaa-990341d7e42e',length:8.98,label:'BUT YOU STOPPED',color:palette.yellow},
  {from:13.1,to:18.8,id:'b113b525-645f-4f24-890e-5efac1fe5788',length:9.81,label:'ONE IDEA, DRAWN STEP BY STEP',color:palette.mint},
  {from:18.8,to:21.6,id:'c79dbb29-406e-4917-85f2-48e2a0393ec4',length:8.85,label:'A FOUNDER WITH A PROBLEM',color:palette.blue},
  {from:29.2,to:33.3,id:'5fcedc2d-61b3-4714-865c-6d6e634161a5',length:7.52,label:'COMPLEX TO CLEAR',color:palette.yellow},
  {from:33.3,to:37,id:'4cca8201-ea97-4998-a8be-72a94e19d408',length:6.45,label:'NO CAMERA REQUIRED',color:palette.blue},
  {from:37,to:40.8,id:'caae30aa-d9a4-45d9-8ac3-e4199f16fa90',length:7.21,label:'THE HONEST PART',color:palette.coral},
  {from:40.8,to:44.8,id:'044bcb9a-1cc6-49a5-91e2-9472f8ba5403',length:8.47,label:'FOR FOUNDERS + AGENCIES',color:palette.mint},
];

function Badge({text,color}:{text:string;color:string}) {
  return <div style={{position:'absolute',top:95,left:70,right:70,display:'flex',alignItems:'center',gap:15,fontFamily:font}}><div style={{width:12,height:12,borderRadius:20,background:color}}/><span style={{fontSize:25,fontWeight:850,letterSpacing:3.3,color:palette.ink}}>{text}</span></div>;
}
function DrawnScene({scene}:{scene:typeof sceneData[number]}) {
  const duration=frameAt(scene.to)-frameAt(scene.from);
  // Play through the colored hold without reaching EOF, including frame rounding.
  const rate=(scene.length-0.08)/(duration/FPS);
  return <AbsoluteFill style={{backgroundColor:'white'}}><OffthreadVideo src={asset(scene.id)} playbackRate={rate} volume={PENCIL_CLIP_VOLUME} style={{width:'100%',height:'100%',objectFit:'cover'}}/><Badge text={scene.label} color={scene.color}/></AbsoluteFill>;
}
function Reveal({children,delay=0,style={}}:{children:React.ReactNode;delay?:number;style?:React.CSSProperties}) {
  const f=useCurrentFrame(); const p=ease(f,delay,delay+12);
  return <div style={{opacity:p,transform:`translateY(${(1-p)*24}px)`,...style}}>{children}</div>;
}
const card:React.CSSProperties={background:'#fff',border:'2px solid #e3e9e8',borderRadius:24,boxShadow:'0 10px 38px rgba(38,64,59,0.08)'};
function PipelineScene(){
 const f=useCurrentFrame();
 const steps=[{name:'OFFER',sub:'A complex idea',color:palette.coral,at:46},{name:'TOPIC',sub:'A story to tell',color:palette.blue,at:95},{name:'ARTICLE',sub:'A deeper insight',color:palette.lavender,at:112}];
 return <AbsoluteFill style={{background:'#fbfdfb',fontFamily:font,color:palette.ink}}>
  <Badge text="FROM COMPLEX TO COMPELLING" color={palette.mint}/>
  <Reveal delay={0} style={{position:'absolute',top:250,left:76,right:76}}><div style={{fontSize:27,fontWeight:800,letterSpacing:3,color:'#658077'}}>THE WHITEBOARD ENGINE</div><div style={{fontSize:74,fontWeight:900,lineHeight:1.03,letterSpacing:-3,marginTop:23}}>Your idea.<br/><span style={{color:'#398c77'}}>Drawn to life.</span></div></Reveal>
  <div style={{position:'absolute',top:570,left:80,right:80,display:'flex',gap:15}}>{steps.map((s,i)=><Reveal key={s.name} delay={s.at} style={{flex:1}}><div style={{...card,padding:'28px 20px',height:148,borderTop:`8px solid ${s.color}`}}><div style={{fontSize:25,letterSpacing:1.3,fontWeight:900}}>{s.name}</div><div style={{fontSize:20,marginTop:13,color:palette.muted}}>{s.sub}</div></div></Reveal>)}</div>
  <Reveal delay={125} style={{position:'absolute',top:820,left:0,right:0,textAlign:'center',fontSize:55,color:'#94b7a8'}}>↓</Reveal>
  <Reveal delay={145} style={{position:'absolute',top:930,left:90,right:90}}><div style={{...card,padding:'38px 42px',display:'flex',alignItems:'center',gap:30}}><div style={{background:palette.mint,width:108,height:108,borderRadius:22,display:'grid',placeItems:'center',fontSize:45}}>▶</div><div><div style={{fontSize:37,fontWeight:900}}>WHITEBOARD VIDEO</div><div style={{fontSize:24,color:palette.muted,marginTop:8}}>Made to make ideas click</div></div></div></Reveal>
 </AbsoluteFill>;
}
function ProcessScene(){
 const steps=[{t:'RESEARCH',s:'Understand the idea',at:12,c:palette.blue},{t:'SCRIPT',s:'Shape the story',at:27,c:palette.yellow},{t:'VOICEOVER',s:'Give it a voice',at:46,c:palette.lavender},{t:'ANIMATION',s:'Bring it to life',at:68,c:palette.mint}];
 return <AbsoluteFill style={{background:'#fbfdfb',fontFamily:font,color:palette.ink}}><Badge text="THE FULL PROCESS, HANDLED" color={palette.mint}/>
  <Reveal delay={0} style={{position:'absolute',top:245,left:76,right:76}}><div style={{fontSize:73,fontWeight:900,letterSpacing:-3,lineHeight:1.05}}>From idea<br/>to <span style={{color:'#398c77'}}>finished video.</span></div></Reveal>
  <div style={{position:'absolute',top:495,left:76,right:76,display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>{steps.map((x,i)=><Reveal key={x.t} delay={x.at}><div style={{...card,padding:'26px 28px',minHeight:145}}><div style={{width:34,height:7,borderRadius:8,background:x.c,marginBottom:20}}/><div style={{fontSize:27,fontWeight:900,letterSpacing:1}}>{x.t}</div><div style={{fontSize:21,color:palette.muted,marginTop:9}}>{x.s}</div></div></Reveal>)}</div>
  <Reveal delay={87} style={{position:'absolute',top:1050,left:76,right:76}}><div style={{background:palette.ink,borderRadius:25,padding:'32px 38px',color:'white',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontWeight:800,fontSize:26,letterSpacing:2}}>TURNAROUND</span><span style={{fontWeight:900,fontSize:50,color:palette.yellow}}>48 HOURS</span></div></Reveal>
 </AbsoluteFill>;
}
function OutroScene(){
 return <AbsoluteFill style={{background:'#f8fcfa',fontFamily:font,color:palette.ink}}><Badge text="LET'S MAKE SOMETHING GOOD" color={palette.mint}/>
  <Reveal delay={0} style={{position:'absolute',top:310,left:80,right:80}}><div style={{fontSize:28,letterSpacing:3,fontWeight:900,color:'#478e7b'}}>YOUR NEXT IDEA</div><div style={{fontSize:81,fontWeight:900,lineHeight:1.04,letterSpacing:-4,marginTop:25}}>Let’s draw<br/>people <span style={{color:'#398c77'}}>in.</span></div><div style={{fontSize:28,color:palette.muted,lineHeight:1.4,marginTop:30}}>For your brand or your clients.</div></Reveal>
  <Reveal delay={11} style={{position:'absolute',top:790,left:80,right:80}}><div style={{...card,padding:36,display:'flex',alignItems:'center',gap:24}}><div style={{height:75,width:75,borderRadius:20,background:palette.yellow,display:'grid',placeItems:'center',fontSize:39}}>↗</div><div><div style={{fontSize:34,fontWeight:900}}>COMMENT OR DM</div><div style={{fontSize:23,color:palette.muted,marginTop:7}}>Let's cook up your next batch</div></div></div></Reveal>
 </AbsoluteFill>;
}
function Captions(){
 const f=useCurrentFrame(); const t=f/FPS;
 let groupIndex=GROUPS.findIndex((g,i)=>t>=g[0].s-0.02 && t<Math.min((GROUPS[i+1]?.[0].s??53.1)-0.01,(g[g.length-1].s+0.65)));
 if(!SHOW_CAPTIONS || groupIndex<0)return null;
 const group=GROUPS[groupIndex]; let active=0; group.forEach((w,i)=>{if(t>=w.s-0.02)active=i;});
 return <div style={{position:'absolute',bottom:300,left:65,right:65,display:'flex',justifyContent:'center',pointerEvents:'none',fontFamily:font}}><div style={{background:'rgba(26,35,40,.93)',padding:'15px 23px',borderRadius:18,display:'flex',gap:'5px 10px',justifyContent:'center',flexWrap:'wrap',maxWidth:910}}>{group.map((word,i)=><span key={i} style={{color:i===active?palette.yellow:'#fff',fontWeight:900,fontSize:52,lineHeight:1.17,letterSpacing:-1}}>{word.w}</span>)}</div></div>;
}
function Progress(){const {durationInFrames}=useVideoConfig();const f=useCurrentFrame();return <div style={{position:'absolute',top:0,left:0,right:0,height:8,background:'#edf2ef'}}><div style={{height:'100%',width:`${100*f/(durationInFrames-1)}%`,background:palette.mint}}/></div>}
const cues=[{t:9.7,id:WHOOSH,v:.11},{t:13.1,id:POP,v:.12},{t:18.8,id:WHOOSH,v:.09},{t:21.6,id:WHOOSH,v:.1},{t:23.5,id:CLICK,v:.09},{t:24.88,id:CLICK,v:.09},{t:25.44,id:CLICK,v:.09},{t:26.47,id:POP,v:.12},{t:29.2,id:WHOOSH,v:.09},{t:33.3,id:POP,v:.09},{t:37,id:WHOOSH,v:.08},{t:40.8,id:POP,v:.1},{t:44.8,id:WHOOSH,v:.1},{t:45.26,id:CLICK,v:.09},{t:45.77,id:CLICK,v:.09},{t:46.4,id:CLICK,v:.09},{t:47.12,id:CLICK,v:.09},{t:47.75,id:CHIME,v:.1},{t:49.2,id:WHOOSH,v:.1},{t:50.74,id:POP,v:.1}];
export default function ClientShowcase(){
 return <AbsoluteFill style={{background:'white'}}>
  {sceneData.map(s=><Sequence key={s.id} from={frameAt(s.from)} durationInFrames={frameAt(s.to)-frameAt(s.from)}><DrawnScene scene={s}/></Sequence>)}
  <Sequence from={frameAt(21.6)} durationInFrames={frameAt(29.2)-frameAt(21.6)}><PipelineScene/></Sequence>
  <Sequence from={frameAt(44.8)} durationInFrames={frameAt(49.2)-frameAt(44.8)}><ProcessScene/></Sequence>
  <Sequence from={frameAt(49.2)} durationInFrames={frameAt(54)-frameAt(49.2)}><OutroScene/></Sequence>
  <Audio src={asset(VOICE)} volume={1}/>
  <Audio src={asset(MUSIC)} volume={(f)=>MUSIC_BASE_VOLUME*interpolate(f,[0,25,1530,1619],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}/>
  {cues.map((c,i)=><Sequence key={i} from={frameAt(c.t)}><Audio src={asset(c.id)} volume={c.v}/></Sequence>)}
  <Captions/><Progress/>
 </AbsoluteFill>;
}

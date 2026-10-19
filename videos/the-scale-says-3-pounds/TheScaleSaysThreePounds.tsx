/* REMOTION_CONFIG = { fps: 30, durationInFrames: 1434, width: 1080, height: 1920 } */
import React from 'react';
import { AbsoluteFill, Audio, Easing, Freeze, Img, OffthreadVideo, Sequence, interpolate, spring, useCurrentFrame } from 'remotion';

// Single-file editorial composition. All timings follow the supplied AssemblyAI VO.
export const compositionConfig = { id: 'TheScaleSaysThreePounds', fps: 30, durationInSeconds: 47.8, width: 1080, height: 1920 };
const C = { paper: '#efe6d3', light: '#faf5ea', ink: '#27231d', muted: '#827562', red: '#b83b30', gold: '#e1ad3c', yellow: '#f2d88c', teal: '#3d6c63', blue: '#537e91', paleBlue: '#d6e4e5', line: '#ccbea5' };
const FONT = 'Arial, Helvetica, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(.33, 1, .68, 1);
const travel = Easing.bezier(.65, 0, .12, 1);
const p = (f: number, at: number, duration = 18) => interpolate(f, [at, at + duration], [0, 1], { ...CLAMP, easing: ease });
const asset = (id: string) => `https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=${id}`;
const MEDIA = {
  voice: asset('48837790-9e10-45cb-be8b-19cf5be385b7'),
  scale: asset('fdaa3917-fd9a-4968-bb37-f8a2c94a43ab'),
  salt: asset('efe51274-9bcc-40ae-8cd9-b3ea2129dfc1'),
  saltMacro: asset('90f266c6-60ce-46c8-b013-38c5864ba0b5'),
  water: asset('bd731403-93f9-4519-956b-93044e64fc8b'),
  waterScale: asset('8c7f1b4a-1fd9-425c-9b6e-050e3bbe5e89'),
  pasta: asset('543c2b8d-609d-48e3-9eba-4ffd09838231'),
  noodles: asset('be3d26fa-11ac-4a46-a75f-aa9ff9331d95'),
  bread: asset('bd2ce298-d439-44dd-b834-68f2f64fd360'),
  eating: asset('469dbe94-87a7-402c-bd16-fc695945d40a'),
  meal: asset('bd1a217a-4566-436c-95b9-087932d64670'),
  walk: asset('f0aa6e53-b66f-47c1-85bd-52a87b594758'),
  pencil: asset('bf810aca-6f5a-418c-9f60-bb715550934c'),
  impact: asset('6157bf75-5603-4533-8e59-b93b815934bf'),
  chime: asset('2d70f904-7701-492f-8085-89ffed6e2861'),
  stream: asset('7412fc38-a77a-4b0f-b187-bd5e459aa9fc'),
  sparkle: asset('16d0b9a2-6984-4a90-ad8d-41be83b4f0df'),
  shimmer: asset('1f09e50a-d002-4d4a-acde-d11eeed27e26'),
  music: asset('f4a1ed94-671d-4de6-ba60-43370bfafe68'), // docu-pluck: Vox-style pizzicato bed, 63s
  coreage: asset('4080f01f-a9db-4326-aa2b-766703362521'),
};
const DURATION = 1434; // 1344 VO + 90f CoreAge end card

// No text captions: the pictures carry the narrative. Labels identify only key evidence.
const BEATS = [
  { at: 0, x: 0, y: 0, label: 'THE MORNING AFTER' },
  { at: 89, x: 1400, y: 0, label: 'THE CALORIE TEST' },
  { at: 290, x: 2800, y: 0, label: 'FOLLOW THE WEIGHT' },
  { at: 365, x: 2800, y: 2200, label: '01 / WATER' },
  { at: 483, x: 1400, y: 2200, label: '02 / STORED FUEL' },
  { at: 725, x: 0, y: 2200, label: '03 / FOOD IN TRANSIT' },
  { at: 900, x: 0, y: 4400, label: 'THE DISTINCTION' },
  { at: 982, x: 1400, y: 4400, label: 'WHAT THE SCALE SEES' },
  { at: 1217, x: 2800, y: 4400, label: 'THE BIGGER PICTURE' },
  { at: 1344, x: 4200, y: 4400, label: 'COREAGE' },
];
function cameraAt(f: number) {
  let i = BEATS.length - 1;
  while (i > 0 && f < BEATS[i].at) i--;
  const a = BEATS[i];
  const b = BEATS[i + 1];
  if (b && f >= b.at - 18) {
    const t = travel(interpolate(f, [b.at - 18, b.at], [0, 1], CLAMP));
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: 1 - .14 * Math.sin(t * Math.PI) };
  }
  return { x: a.x, y: a.y, z: 1 + .012 * p(f, a.at, (b?.at ?? DURATION) - a.at) };
}

const Paper: React.FC = () => <AbsoluteFill style={{ backgroundColor: C.paper }}>
  <svg width="100%" height="100%" style={{ opacity: .27 }}><defs><pattern id="fibers-scale" width="83" height="71" patternUnits="userSpaceOnUse"><path d="M4 9l8 1M39 42l3-4M65 17l9 2M13 60l4-1" stroke="#ad9879" strokeWidth=".7"/><circle cx="49" cy="12" r=".7" fill="#a18f73"/><circle cx="24" cy="32" r=".6" fill="#a18f73"/></pattern></defs><rect width="100%" height="100%" fill="url(#fibers-scale)"/></svg>
</AbsoluteFill>;

const Tape: React.FC<{ right?: boolean }> = ({ right }) => <div style={{ position: 'absolute', top: -19, ...(right ? { right: -21 } : { left: -21 }), width: 122, height: 38, background: 'rgba(220,186,116,.74)', transform: `rotate(${right ? 32 : -32}deg)`, clipPath: 'polygon(3% 5%,97% 0,100% 88%,2% 100%,0 60%)' }}/>;
const Place: React.FC<{ f: number; at?: number; x: number; y: number; w?: number; rotate?: number; children: React.ReactNode }> = ({ f, at = 0, x, y, w, rotate = 0, children }) => {
  if (f < at) return null;
  const s = spring({ frame: f - at, fps: 30, config: { damping: 19, stiffness: 180, mass: .8 } });
  return <div style={{ position: 'absolute', left: x, top: y, width: w, opacity: p(f, at, 6), transform: `translateY(${(1-s)*44}px) rotate(${rotate+(1-s)*3}deg) scale(${1+(1-s)*.055})`, transformOrigin: '50% 50%' }}>{children}</div>;
};
const Title: React.FC<{ children: React.ReactNode; y?: number; size?: number; color?: string }> = ({ children, y = 300, size = 93, color = C.ink }) => <div style={{ position: 'absolute', left: 86, top: y, width: 820, fontFamily: SERIF, fontWeight: 900, fontSize: size, lineHeight: 1.01, letterSpacing: -4, color }}>{children}</div>;
const Slip: React.FC<{ children: React.ReactNode; color?: string; bg?: string }> = ({ children, color = C.ink, bg = C.yellow }) => <div style={{ display: 'inline-block', background: bg, color, padding: '13px 23px', fontFamily: FONT, fontSize: 31, fontWeight: 800, letterSpacing: 1, border: `2px solid ${C.ink}`, boxShadow: '3px 5px 0 #27231d15' }}>{children}</div>;
const Stamp: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.red }) => <div style={{ border: `6px solid ${color}`, padding: '15px 25px', fontFamily: FONT, fontSize: 44, fontWeight: 900, letterSpacing: 2, color, whiteSpace: 'nowrap' }}>{children}</div>;

// Source trims are seconds, converted at composition fps (not the source file fps).
const Film: React.FC<{ src: string; from: number; to: number; x: number; y: number; w: number; h: number; trim?: number; rotate?: number }> = ({ src, from, to, x, y, w, h, trim = 1, rotate = -2 }) => {
  const f = useCurrentFrame();
  if (f < from) return null;
  const local = Math.min(f - from, to - from - 1);
  return <div style={{ position: 'absolute', left: x, top: y, width: w + 30, height: h + 43, padding: '15px 15px 28px', background: C.light, border: `2px solid ${C.ink}`, boxShadow: '9px 16px 0 #27231d20', transform: `rotate(${rotate}deg) translateY(${(1-p(f,from,10))*24}px)`, opacity: p(f, from, 5) }}>
    <div style={{ width: w, height: h, overflow: 'hidden', background: C.paleBlue }}>
      <Sequence from={from} layout="none">{f < to ? <OffthreadVideo src={src} startFrom={Math.round(trim*30)} muted style={{ width: w, height: h, objectFit: 'cover', filter: 'sepia(.18) saturate(.84) contrast(1.04)', transform: `scale(${1.025+local*.00015})` }}/> : <Freeze frame={to-from-1}><OffthreadVideo src={src} startFrom={Math.round(trim*30)} muted style={{ width: w, height: h, objectFit: 'cover', filter: 'sepia(.18) saturate(.84) contrast(1.04)', transform: `scale(${1.025+local*.00015})` }}/></Freeze>}</Sequence>
    </div><Tape/><Tape right/>
  </div>;
};
const Draw: React.FC<{ d: string; t: number; color?: string; width?: number }> = ({ d, t, color = C.red, width = 7 }) => <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1-t}/>;
const Drop: React.FC<{ x: number; y: number; size?: number; color?: string }> = ({ x, y, size = 1, color = C.blue }) => <g transform={`translate(${x} ${y}) scale(${size})`}><path d="M0 -27C-7 -15 -22 1 -22 13A22 22 0 0 0 22 13C22 1 7 -15 0 -27Z" fill={color} stroke={C.ink} strokeWidth="2.7"/><path d="M-12 9q-6 12 5 17" fill="none" stroke={C.light} strokeWidth="3" strokeLinecap="round" opacity=".7"/></g>;
const Hex: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 25 }) => <polygon points={Array.from({ length: 6 }, (_, i) => `${x+Math.cos(i*Math.PI/3)*r},${y+Math.sin(i*Math.PI/3)*r}`).join(' ')} fill={C.gold} stroke={C.ink} strokeWidth="3"/>;
const Plate: React.FC<{ x: number; y: number; size?: number }> = ({ x, y, size = 1 }) => <g transform={`translate(${x} ${y}) scale(${size})`}><circle r="43" fill={C.light} stroke={C.ink} strokeWidth="3"/><circle r="31" fill="none" stroke={C.line} strokeWidth="3"/><path d="M-18 7q15-30 30-5M-18 13q20-25 35-3M-9 20q12-23 26-4" fill="none" stroke={C.red} strokeWidth="6" strokeLinecap="round"/><path d="M-58-37v73M-65-37v18q7 12 14 0v-18M58-37v73M58-37q17 20 0 36" stroke={C.ink} strokeWidth="4" fill="none"/></g>;
const Scale: React.FC<{ value?: string; color?: string; mixed?: boolean }> = ({ value = '+3.0', color = C.red, mixed = false }) => <svg width="800" height="540" viewBox="0 0 800 540">
  <path d="M118 95Q105 65 147 60H656Q694 65 685 100L739 429Q743 471 697 480H108Q60 477 68 429Z" fill={C.light} stroke={C.ink} strokeWidth="7"/>
  <path d="M125 118L94 424M675 118l37 306" stroke={C.line} strokeWidth="3"/>
  <rect x="220" y="106" width="360" height="164" rx="12" fill={C.paleBlue} stroke={C.ink} strokeWidth="5"/>
  <text x="400" y="216" textAnchor="middle" fontFamily={FONT} fontSize="99" fontWeight="800" letterSpacing="-5" fill={color}>{value}</text><text x="609" y="233" fontFamily={FONT} fontSize="27" fill={C.muted}>lb</text>
  {mixed ? <g><Drop x={221} y={361}/><Plate x={342} y={361} size={.65}/><Hex x={463} y={361}/><circle cx="583" cy="361" r="26" fill={C.red} stroke={C.ink} strokeWidth="3"/></g> : <path d="M199 345h402M199 369h402M199 393h402" stroke={C.line} strokeWidth="4"/>}
</svg>;

const Hook: React.FC<{ f: number }> = ({ f }) => <>
  <Title>Three pounds.<br/><span style={{ color: C.red }}>Overnight?</span></Title>
  <Film src={MEDIA.scale} from={0} to={89} x={100} y={665} w={765} h={795} trim={2} rotate={-2}/>
  <Place f={f} at={30} x={475} y={1220} rotate={3}><div style={{ background: C.yellow, border: `3px solid ${C.ink}`, padding: '14px 35px', fontFamily: FONT, color: C.red, fontWeight: 900, fontSize: 125, letterSpacing: -6 }}>+3 <span style={{ fontSize: 43, letterSpacing: 0 }}>lb</span></div></Place>
  <Place f={f} at={52} x={140} y={1550} rotate={-1}><Slip>ONE MORNING. ONE NUMBER.</Slip></Place>
</>;
const Calories: React.FC<{ f: number }> = ({ f }) => <>
  <Title>As body fat?</Title>
  <Film src={MEDIA.meal} from={89} to={140} x={90} y={1035} w={240} h={360} rotate={-5}/>
  <Film src={MEDIA.pasta} from={140} to={195} x={362} y={1010} w={240} h={360} rotate={1}/>
  <Film src={MEDIA.eating} from={195} to={290} x={637} y={1045} w={240} h={360} rotate={5}/>
  <Place f={f} at={141} x={90} y={590} w={820}><div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 175, letterSpacing: -12, color: C.red }}>{Math.round(10500*p(f,141,60)).toLocaleString('en-US')}<span style={{ fontSize: 67 }}>+</span></div><div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 800, letterSpacing: 3 }}>EXTRA CALORIES</div></Place>
  <Place f={f} at={249} x={133} y={1495} rotate={-3}><Slip>ABOVE WHAT YOU BURNED</Slip></Place>
</>;
const Mystery: React.FC<{ f: number }> = ({ f }) => <>
  <Title>So what<br/>changed?</Title>
  <div style={{ position: 'absolute', left: 93, top: 870 }}><Scale/></div>
  <svg width="1080" height="1920" style={{ position: 'absolute' }}><Draw d="M280 910Q160 720 260 640M260 640l-9 43M260 640l-38 18" t={p(f,292,28)} color={C.red}/><Draw d="M770 920Q870 715 770 645M770 645l39 21M770 645l7 43" t={p(f,303,28)}/></svg>
  <Place f={f} at={315} x={290} y={660}><span style={{ fontFamily: SERIF, fontSize: 180, color: C.red }}>?</span></Place>
  <Place f={f} at={330} x={620} y={695} rotate={6}><span style={{ fontFamily: SERIF, fontSize: 150, color: C.red }}>?</span></Place>
</>;
const Water: React.FC<{ f: number }> = ({ f }) => {
  const t = p(f, 416, 38);
  return <>
    <Title>Water.</Title>
    <Film src={MEDIA.salt} from={365} to={413} x={100} y={600} w={410} h={690} trim={1} rotate={-3}/>
    <Film src={MEDIA.saltMacro} from={395} to={443} x={577} y={578} w={275} h={280} trim={2} rotate={4}/>
    <Film src={MEDIA.water} from={443} to={483} x={100} y={600} w={410} h={690} trim={3} rotate={-3}/>
    <Place f={f} at={412} x={573} y={928} w={300} rotate={2}><svg width="300" height="450" viewBox="0 0 300 450"><defs><clipPath id="jar-water"><path d="M65 48H235L215 378Q150 405 85 378Z"/></clipPath></defs><path d="M65 48H235L215 378Q150 405 85 378Z" fill={C.light} stroke={C.ink} strokeWidth="5"/><g clipPath="url(#jar-water)"><rect x="60" y={350-t*220} width="180" height="300" fill={C.blue}/><path d={`M60 ${350-t*220}q45-20 90 0t90 0`} fill="none" stroke={C.paleBlue} strokeWidth="8"/>{[0,1,2,3,4].map(i=><circle key={i} cx={110+i%3*40} cy={350-t*165-i*17} r="7" fill={C.paleBlue} opacity=".8"/>)}</g><path d="M60 48h180M90 36h120" stroke={C.ink} strokeWidth="6"/><text x="150" y="443" textAnchor="middle" fontFamily={FONT} fontSize="30" fontWeight="800" fill={C.blue}>HELD FLUID</text></svg></Place>
    <svg width="1080" height="1920" style={{ position: 'absolute' }}><Draw d="M593 875Q778 862 735 945M735 945l-23-24M735 945l29-8" t={p(f,415,20)}/></svg>
    <Place f={f} at={446} x={150} y={1460} rotate={-2}><Slip>MORE FLUID. MORE WEIGHT.</Slip></Place>
  </>;
};
const Glycogen: React.FC<{ f: number }> = ({ f }) => {
  const water = p(f, 592, 35);
  const nodes = [{x:290,y:200},{x:370,y:200},{x:450,y:200},{x:530,y:200},{x:610,y:200},{x:450,y:120},{x:530,y:280}];
  return <>
    <Title>Carbs bring<br/>company.</Title>
    <Film src={MEDIA.bread} from={483} to={522} x={100} y={610} w={352} h={360} trim={1} rotate={-3}/>
    <Film src={MEDIA.noodles} from={510} to={566} x={523} y={590} w={332} h={360} trim={1} rotate={3}/>
    <Place f={f} at={535} x={91} y={1070} w={800}><svg width="800" height="410" viewBox="0 0 800 410">
      <path d="M290 200H610M450 200V120M530 200V280" stroke={C.ink} strokeWidth="7"/>
      {nodes.map((n,i)=><g key={i} opacity={p(f,535+i*5,10)}><Hex x={n.x} y={n.y} r={32}/></g>)}
      {[{x:240,y:98},{x:355,y:85},{x:570,y:85},{x:665,y:160},{x:655,y:292},{x:400,y:310},{x:285,y:310},{x:490,y:345}].map((n,i)=><g key={i} opacity={p(f,592+i*3,12)} transform={`translate(${(1-water)*(i%2?-75:75)} ${(1-water)*-60})`}><Drop x={n.x} y={n.y} size={.7}/></g>)}
      <Draw d="M110 180H210M210 180l-19-15M210 180l-19 15" t={p(f,550,22)} color={C.ink} width={4}/>
      <text x="18" y="163" fill={C.ink} fontFamily={FONT} fontSize="28" fontWeight="800">STORED</text><text x="18" y="193" fill={C.ink} fontFamily={FONT} fontSize="28" fontWeight="800">FUEL</text>
    </svg></Place>
    <Place f={f} at={569} x={220} y={1006} rotate={-2}><Slip>GLYCOGEN</Slip></Place>
    <Place f={f} at={631} x={237} y={1530} rotate={1}><Slip color={C.light} bg={C.blue}>+ WATER</Slip></Place>
    <Place f={f} at={677} x={676} y={1420} rotate={3}><svg width="180" height="180" viewBox="0 0 180 180"><path d="M80 135V35M80 35l-30 33M80 35l30 33" stroke={C.red} strokeWidth="9" fill="none" strokeLinecap="round"/></svg></Place>
  </>;
};
const Digestion: React.FC<{ f: number }> = ({ f }) => {
  const t = p(f, 796, 63);
  // A continuous illustrative GI route; particles follow the same sampled curve.
  const route = 'M200 40V140C200 170 300 130 305 215C310 285 170 292 165 235C85 230 95 330 175 328H315Q350 328 350 365Q350 397 310 397H140Q104 397 104 431Q104 466 140 466H309Q345 466 345 500Q345 534 310 534H140Q105 534 105 568Q105 603 145 603H280V660';
  return <>
    <Title>Still in transit.</Title>
    <Film src={MEDIA.eating} from={725} to={780} x={97} y={655} w={310} h={490} trim={3} rotate={-4}/>
    <Film src={MEDIA.meal} from={760} to={810} x={97} y={1190} w={310} h={285} trim={1} rotate={2}/>
    <Place f={f} at={781} x={464} y={647} rotate={2}><svg width="430" height="760" viewBox="0 0 430 760"><path d="M97 80Q10 115 30 260L47 666Q210 720 385 666L403 260Q423 115 333 80" fill={C.light} stroke={C.line} strokeWidth="3"/><path d={route} fill="none" stroke={C.ink} strokeWidth="44" strokeLinecap="round" strokeLinejoin="round"/><path d={route} fill="none" stroke="#d6a18b" strokeWidth="35" strokeLinecap="round" strokeLinejoin="round"/><Draw d={route} t={t} color={C.red} width={19}/><circle cx="200" cy={40+p(f,796,19)*97} r="9" fill={C.yellow} opacity={1-p(f,815,8)}/><circle cx={200+p(f,816,18)*70} cy={170+p(f,816,18)*65} r="9" fill={C.yellow} opacity={p(f,815,4)*(1-p(f,837,6))}/></svg></Place>
    <Place f={f} at={856} x={136} y={1530} rotate={-2}><Slip>FOOD HAS MASS, TOO.</Slip></Place>
  </>;
};
const Verdict: React.FC<{ f: number }> = ({ f }) => <>
  <Title>Weight gain<br/><span style={{ color: C.red }}>≠ fat gain.</span></Title>
  <div style={{ position: 'absolute', left: 95, top: 830 }}><Scale mixed/></div>
  <Place f={f} at={942} x={215} y={1430} rotate={-5}><Stamp>NOT THE SAME THING</Stamp></Place>
</>;
const Total: React.FC<{ f: number }> = ({ f }) => {
  const items = [{at:1068, label:'WATER',color:C.blue},{at:1095,label:'FOOD',color:C.teal},{at:1104,label:'FUEL',color:C.gold},{at:1122,label:'FAT',color:C.red}];
  const collapse = p(f,1143,24);
  return <>
    <Title>It weighs<br/><span style={{ color: C.red }}>everything.</span></Title>
    {f < 1068 && <Film src={MEDIA.waterScale} from={982} to={1068} x={110} y={645} w={745} h={470} trim={2} rotate={-2}/>}
    {items.map((it,i)=>{
      const appear = p(f,it.at,10);
      const y = 665+i*135;
      return <div key={it.label} style={{ position:'absolute',left:114,top:y+(1190-y)*collapse,width:700,height:108,background:it.color,opacity:appear*(1-collapse),border:`3px solid ${C.ink}`,boxShadow:'5px 7px 0 #27231d15',transform:`translateX(${(1-appear)*80}px) rotate(${(i%2?1:-1)*(1-collapse)}deg)`,display:'flex',alignItems:'center',gap:26,paddingLeft:30,color:i===2?C.ink:C.light,fontFamily:FONT,fontSize:38,fontWeight:800,letterSpacing:3 }}>{i===0?<svg width="65" height="65" viewBox="-35 -35 70 70"><Drop x={0} y={0} color={C.paleBlue} size={.7}/></svg>:i===1?<svg width="65" height="65" viewBox="-65 -65 130 130"><Plate x={0} y={0}/></svg>:i===2?<svg width="65" height="65" viewBox="-40 -40 80 80"><Hex x={0} y={0}/></svg>:<svg width="65" height="65"><circle cx="32" cy="32" r="24" fill={C.light} stroke={C.ink} strokeWidth="3"/></svg>}{it.label}</div>;
    })}
    <div style={{ position:'absolute',left:95,top:1170,transform:`translateY(${-collapse*130}px) scale(${.8+collapse*.2})`,transformOrigin:'50% 0' }}><Scale mixed value={f<1143?'— —':'+3.0'} color={C.ink}/></div>
    <Place f={f} at={1168} x={174} y={1510} rotate={-2}><Slip>ONE NUMBER. DIFFERENT THINGS.</Slip></Place>
  </>;
};
const Progress: React.FC<{ f: number }> = ({ f }) => {
  const t = p(f,1263,38);
  return <>
    <Title size={89}>One weigh-in.<br/><span style={{ color:C.teal }}>Not your story.</span></Title>
    <Film src={MEDIA.walk} from={1217} to={1344} x={103} y={660} w={760} h={755} trim={3} rotate={1}/>
    <Place f={f} at={1248} x={134} y={1190} w={685} rotate={-3}><div style={{ padding:'22px 28px 10px',background:C.light,border:`2px solid ${C.ink}`,boxShadow:'5px 7px 0 #27231d20' }}><svg width="620" height="235" viewBox="0 0 620 235"><path d="M20 20v180h580M20 65h580M20 110h580M20 155h580" stroke={C.line} fill="none" strokeWidth="2"/><Draw d="M22 49L72 80L122 59L172 114L222 97L272 129L322 109L372 153L422 135L472 170L522 150L572 187" t={t} color={C.teal} width={6}/><circle cx="122" cy="59" r={13+Math.sin(f*.15)*2} fill={C.light} stroke={C.red} strokeWidth="5"/></svg></div></Place>
    <Place f={f} at={1290} x={201} y={1550} rotate={-1}><Slip bg={C.teal} color={C.light}>ZOOM OUT.</Slip></Place>
  </>;
};
// Brand end card: the CoreAge screenshot at maximum size. No added text.
const BrandEnd: React.FC<{ f: number }> = ({ f }) => <>
  <Place f={f} at={1346} x={45} y={290} w={990} rotate={-1}>
    <div style={{ position: 'relative', background: C.light, padding: '18px 18px 26px', border: `2px solid ${C.ink}`, boxShadow: '10px 18px 0 #27231d20' }}>
      <Img src={MEDIA.coreage} style={{ width: '100%', height: 1260, objectFit: 'contain', display: 'block' }}/>
      <Tape/><Tape right/>
    </div>
  </Place>
</>;
const SCENES = [Hook, Calories, Mystery, Water, Glycogen, Digestion, Verdict, Total, Progress, BrandEnd];
const SFX = [
  // Every camera flight gets the pencil route-draw as the board travels.
  ...BEATS.slice(1).map((b) => ({ at: b.at - 18, id: MEDIA.pencil, volume: .5, frames: 24 })),
  { at: 32, id: MEDIA.impact, volume: 1, frames: 30 },
  { at: 200, id: MEDIA.impact, volume: .9, frames: 30 },
  { at: 412, id: MEDIA.pencil, volume: .65, frames: 45 },
  { at: 443, id: MEDIA.stream, volume: .55, frames: 75 },
  { at: 592, id: MEDIA.sparkle, volume: .6, frames: 26 },
  { at: 796, id: MEDIA.pencil, volume: .65, frames: 45 },
  { at: 942, id: MEDIA.impact, volume: 1, frames: 30 },
  { at: 1068, id: MEDIA.impact, volume: .4, frames: 20 },
  { at: 1095, id: MEDIA.impact, volume: .4, frames: 20 },
  { at: 1104, id: MEDIA.impact, volume: .4, frames: 20 },
  { at: 1122, id: MEDIA.impact, volume: .45, frames: 20 },
  { at: 1143, id: MEDIA.impact, volume: .95, frames: 30 },
  { at: 1263, id: MEDIA.pencil, volume: .5, frames: 45 },
  { at: 1290, id: MEDIA.chime, volume: .55, frames: 48 },
  { at: 1346, id: MEDIA.impact, volume: .5, frames: 30 },
  { at: 1352, id: MEDIA.shimmer, volume: .7, frames: 66 },
];

export default function TheScaleSaysThreePounds() {
  const f = useCurrentFrame();
  const cam = cameraAt(f);
  const current = BEATS.reduce((index,b,i)=>f>=b.at?i:index,0);
  return <AbsoluteFill style={{ background:C.paper, fontFamily:FONT, overflow:'hidden' }}>
    <Paper/>
    <div style={{ position:'absolute',left:0,top:0,width:5600,height:6320,transformOrigin:'0 0',transform:`translate(540px,960px) scale(${cam.z}) translate(${-cam.x-540}px,${-cam.y-960}px)` }}>
      <svg width="5600" height="6320" style={{ position:'absolute',pointerEvents:'none' }}>{BEATS.slice(0,-1).map((b,i)=>{const n=BEATS[i+1];return <Draw key={i} d={`M${b.x+540} ${b.y+960} Q${b.x+540} ${n.y+960} ${n.x+540} ${n.y+960}`} t={p(f,n.at-18,18)} color={C.line} width={10}/>;})}</svg>
      {BEATS.map((b,i)=>{
        // Mount only the current and its immediate neighbours. No hidden off-board video farm.
        if (Math.abs(i-current)>1) return null;
        const Scene = SCENES[i];
        return <div key={b.at} style={{ position:'absolute',left:b.x,top:b.y,width:1080,height:1920 }}><Paper/><div style={{ position:'absolute',inset:0,transform:'translateY(-110px)' }}><Scene f={f}/></div></div>;
      })}
    </div>
    <AbsoluteFill style={{ pointerEvents:'none',background:'radial-gradient(ellipse at 45% 45%,transparent 58%,#66503516 100%)' }}/>
    <Audio src={MEDIA.music} volume={interpolate(f,[0,24,1344,1380,1394,1433],[0,.68,.68,.95,.95,0],CLAMP)}/>
    <Audio src={MEDIA.voice} volume={1}/>
    {SFX.map((s,i)=><Sequence key={i} from={s.at} durationInFrames={s.frames}><Audio src={s.id} volume={s.volume}/></Sequence>)}
  </AbsoluteFill>;
}

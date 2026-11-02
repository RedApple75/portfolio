/* =====================================================================
   Single-canvas site. One field of N square dots is the whole page.
   Each station (hero, about, each role, record, each project, skills,
   contact) is a formation: a target position + brightness for every dot.
   Scrolling moves between consecutive formations; each dot travels on its
   own delay and bows out in depth on the way, so the field visibly
   dissolves and re-forms. Dots a formation doesn't need drift as a faint
   background. Text sits in fixed panels that fade in while a formation
   holds still.
   Formations are built once in "box" units (height 1, centred on 0) and
   placed on screen at resize: right half on wide screens, top on narrow.
   ===================================================================== */
(()=>{
const $=s=>document.querySelector(s);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ss=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
const rng=s=>()=>(s=(s*16807)%2147483647)/2147483647;

/* ---------------- colour mode (cream + F1 red by default) ---------------- */
const THEMES={light:{bg:[239,237,230],fg:[17,16,14],inv:1},dark:{bg:[5,5,5],fg:[239,237,230],inv:0}};
const root=document.documentElement;let TH=THEMES.light;
const setMode=m=>{root.dataset.theme=m;TH=THEMES[m];$('#modeLabel').textContent=m==='dark'?'Dark':'Light';try{localStorage.setItem('rb-theme',m)}catch(e){}};
setMode(root.dataset.theme==='dark'?'dark':'light');
$('#mode').addEventListener('click',()=>setMode(root.dataset.theme==='dark'?'light':'dark'));

/* ---------------- formations (box units: height 1, centred) ----------------
   each point: [x, y, z, v] — v encodes how it is drawn:
     v in (0,1]   shape dot, v = brightness
     v = 2 + b    red dot
     v = -b       photo dot (brightness b; flipped in light mode so the face prints like ink)          */
const F=window.FACE,FB=Uint8Array.from(atob(F.data),c=>c.charCodeAt(0));
function face(){const p=[];for(let j=0;j<F.rows;j++)for(let i=0;i<F.cols;i++){const b=FB[j*F.cols+i];if(!b)continue;
  p.push([(i-F.cols/2+.5)/F.rows,(j-F.rows/2)/F.rows,0,-((b-1)/254*.999+.001)])}return p}
// draw with white (shape) and pure red (#f00) on black, then read the pixels back as dots
function raster(w,h,step,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});
  g.fillStyle='#000';g.fillRect(0,0,w,h);draw(g,w,h);const d=g.getImageData(0,0,w,h).data,p=[];
  for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){const k=(y*w+x)*4,r=d[k],gr=d[k+1];if(r<50)continue;
    const red=r>150&&gr<90;p.push([(x-w/2)/h,(y-h/2)/h,0,red?2+r/255:Math.max(r,gr)/255])}return p}
const text=(str,{weight=600,red=false,h=300,step=2}={})=>{
  const m=document.createElement('canvas').getContext('2d');const font=`${weight} ${h*.9}px "Big Shoulders Display"`;m.font=font;
  const w=Math.ceil(m.measureText(str).width+h*.12);
  return raster(w,h,step,g=>{g.font=font;g.textAlign='center';g.textBaseline='middle';g.fillStyle=red?'#f00':'#fff';g.fillText(str,w/2,h*.54)})};
function gauss(){ // dot-plot of a normal sample, stacked in columns, with the density curve in red
  const r=rng(7),cols=64,dx=1.25/cols,dy=dx,M=1150,stack=new Array(cols).fill(0),p=[];
  for(let n=0;n<M;n++){const z=Math.sqrt(-2*Math.log(r()+1e-9))*Math.cos(2*Math.PI*r());const c=Math.floor((z+3.2)/6.4*cols);
    if(c<0||c>=cols)continue;p.push([(c-cols/2+.5)*dx,.42-stack[c]++*dy,0,.55+.45*r()])}
  const peak=M*(6.4/cols)*.3989*dy;   // expected height of the centre column, so the curve sits on the stacks
  for(let i=0;i<=420;i++){const z=-3.2+6.4*i/420;p.push([z/6.4*1.25,.42+dy*.5-peak*Math.exp(-z*z/2),.05,2.9])}
  for(let i=0;i<cols*2;i++)p.push([-.625+i*dx/2,.44+dy,0,.35]);   // axis
  return p}
function graph(){ // three communities (the three skill areas) around red hubs, joined by dotted edges
  const r=rng(11),p=[],hubs=[[-.34,.2],[.34,.2],[0,-.32]];
  const line=(a,b,v,sp=.011)=>{const n=Math.hypot(b[0]-a[0],b[1]-a[1])/sp|0;for(let i=0;i<=n;i++)p.push([a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n,0,v])};
  const disc=(c,R,v,step=.012)=>{for(let y=-R;y<=R;y+=step)for(let x=-R;x<=R;x+=step)if(x*x+y*y<=R*R)p.push([c[0]+x,c[1]+y,0,v])};
  hubs.forEach((h,k)=>{line(h,hubs[(k+1)%3],.5);for(let i=0;i<9;i++){const a=r()*6.283,d=.12+r()*.12,q=[h[0]+Math.cos(a)*d,h[1]+Math.sin(a)*d];
    line(h,q,.35,.014);disc(q,.012+r()*.012,.95)}disc(h,.045,2.95)});return p}
function sphere(){ // dotted globe; z is real depth so the pointer parallax shows it round
  const p=[],n=4200;for(let i=0;i<n;i++){const y=1-2*(i+.5)/n,r=Math.sqrt(1-y*y),a=i*2.399963,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const land=Math.sin(x*4.1+y*2)*Math.cos(z*3.3-y*1.4)>.15;p.push([x*.42,-y*.42,z*.6,(land?.85:.22)*(.35+.65*(z*.5+.5))])}return p}
// the five project figures, drawn once and read back as dots (same motifs as the main site's previews)
function art(kind){const W=420,H=300;return raster(W,H,2,g=>{const r=rng(kind.length*977);g.strokeStyle=g.fillStyle='#fff';
  if(kind==='bars'){const n=12;for(let i=0;i<n;i++){const v=.25+.7*Math.abs(Math.sin(i*1.7+i*i*.1));g.fillStyle=i===7?'#f00':'#fff';g.fillRect(W*.06+i*W*.88/n,H*.92-v*H*.82,W/n*.62,v*H*.82)}}
  if(kind==='graph'){const pts=[...Array(24)].map(()=>[r()*W*.9+W*.05,r()*H*.84+H*.08]);g.lineWidth=2;
    pts.forEach((a,i)=>pts.forEach((b,j)=>{if(j>i&&Math.hypot(a[0]-b[0],a[1]-b[1])<W*.22){g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke()}}));
    pts.forEach((q,i)=>{g.fillStyle=i%7===3?'#f00':'#fff';g.beginPath();g.arc(q[0],q[1],7,0,7);g.fill()})}
  if(kind==='grid'){for(let i=0;i<10;i++)for(let j=0;j<7;j++){const on=Math.sin(i*3.1+j*1.7)>0;g.fillStyle=on?(i===6&&j===2?'#f00':'#fff'):'#555';g.fillRect(W*.05+i*W*.093,H*.06+j*H*.135,W*.07,H*.1)}}
  if(kind==='flow'){g.lineWidth=5;[.18,.5,.82].forEach((x,i)=>{g.strokeRect(W*x-W*.1,H*.36,W*.2,H*.28);const l=[.7,.4,.85][i];g.fillStyle=i===1?'#f00':'#fff';g.fillRect(W*x-W*.1,H*.64-H*.28*l,W*.2,H*.28*l)});
    g.beginPath();g.moveTo(W*.28,H*.5);g.lineTo(W*.4,H*.5);g.moveTo(W*.6,H*.5);g.lineTo(W*.72,H*.5);g.stroke();g.beginPath();g.ellipse(W*.5,H*.5,W*.4,H*.4,0,Math.PI*1.1,Math.PI*1.9);g.stroke()}
  if(kind==='wave'){g.lineWidth=5;for(let k=0;k<3;k++){g.strokeStyle=k===1?'#f00':'#fff';g.beginPath();for(let x=0;x<W;x+=2){const y=H*(.24+k*.26)+Math.sin(x*.03*(k+1))*H*.08*(1+Math.sin(x*.005));x?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}}
})}

/* ---------------- WebGL ---------------- */
const cv=$('#field'),gl=cv.getContext('webgl',{antialias:false,alpha:true,premultipliedAlpha:true});
if(!gl){document.body.classList.add('nogl');return}
const VS=`
attribute vec4 aA,aB,aR;   // formation k, formation k+1, random (dir.xy, delay, depth jitter)
uniform vec2 uRes,uC,uMouse;uniform float uScale,uDot,uT,uIntro,uInv,uDpr,uTime,uAmb;uniform vec3 uFg;
varying vec4 vCol;
float dec(float v,out float red,out float amb){red=step(1.5,v);amb=1.-step(1e-5,abs(v));float l=v>1.5?v-2.:v;if(l<0.){l=-l;l=mix(l,1.-l,uInv);}return l;}
void main(){
  float rA,mA,rB,mB;float lA=dec(aA.w,rA,mA),lB=dec(aB.w,rB,mB);
  float d=aR.z;
  float e=clamp((uT*1.5-d*.5),0.,1.);e=e*e*(3.-2.*e);                       // each dot leaves on its own delay
  vec3 p=mix(aA.xyz,aB.xyz,e);
  p.xy+=aR.xy*sin(3.1416*e)*.22;p.z+=sin(3.1416*e)*(1.+aR.w);               // bow out sideways and toward the camera in transit
  float ie=clamp((uIntro-d*.9)/1.6,0.,1.);ie=1.-pow(1.-ie,4.);              // load: fly in from off-screen (~3 s)
  p=mix(vec3(aR.xy*2.2,1.6+aR.w),p,ie);
  float amb=mix(mA,mB,e),l=mix(lA,lB,e),red=mix(rA,rB,e);
  if(amb>.5)p.xy+=vec2(sin(uTime*.2+d*40.),cos(uTime*.17+d*31.))*.01;      // background dots drift a little
  float persp=1./(1.-p.z*.35);
  vec2 s=uC+(p.xy*uScale+uMouse*p.z*uScale*.04)*persp;
  gl_Position=vec4(s/uRes*2.-1.,0.,1.);gl_Position.y*=-1.;
  float sz=amb>.5?1.6:uDot*(.32+.68*l);
  gl_PointSize=max(1.,sz*persp*uDpr);
  float a=amb>.5?uAmb:(.22+.78*l);a*=smoothstep(0.,.3,ie);
  vec3 c=mix(uFg,vec3(225.,6.,0.)/255.,red);
  vCol=vec4(c*a,a);
}`;
const FS=`precision mediump float;varying vec4 vCol;void main(){gl_FragColor=vCol;}`;
const sh=(t,src)=>{const o=gl.createShader(t);gl.shaderSource(o,src);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(o));return o};
const prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);gl.useProgram(prog);
gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
const U=n=>gl.getUniformLocation(prog,n),LA=gl.getAttribLocation(prog,'aA'),LB=gl.getAttribLocation(prog,'aB'),LR=gl.getAttribLocation(prog,'aR');

const panels=[...document.querySelectorAll('.st')],S=panels.length;
$('#ctot').textContent=String(S).padStart(2,'0');
let shapes=null,N=0,bufs=[],W=1,H=1,dpr=1,box={cx:0,cy:0,h:.8};

// station → formation (stations 2–5 are the four roles, 7–11 the five projects)
const build=()=>[face(),gauss(),text('01',{red:true}),text('02'),text('03'),text('04'),text('9.73',{weight:500}),
  art('bars'),art('graph'),art('grid'),art('flow'),art('wave'),graph(),sphere()];

// fit a formation into N slots: shuffle (so dots trade places between stations), subsample if too many, rest become background
function place(pts,seed){
  const r=rng(seed),idx=pts.map((_,i)=>i);for(let i=idx.length-1;i>0;i--){const j=r()*(i+1)|0;[idx[i],idx[j]]=[idx[j],idx[i]]}
  const out=new Float32Array(N*4),use=Math.min(pts.length,N-600),ar=W/H;
  for(let n=0;n<N;n++){const o=n*4;
    if(n<use){const q=pts[idx[n]];out[o]=box.cx+q[0]*box.h;out[o+1]=box.cy+q[1]*box.h;out[o+2]=q[2];out[o+3]=q[3]}
    else{out[o]=(r()-.5)*ar*1.08;out[o+1]=(r()-.5)*1.08;out[o+2]=(r()-.5)*1.4;out[o+3]=0}}
  return out}
function layout(){
  const b=cv.getBoundingClientRect();W=b.width;H=b.height;dpr=Math.min(devicePixelRatio||1,2);
  cv.width=Math.max(1,W*dpr|0);cv.height=Math.max(1,H*dpr|0);gl.viewport(0,0,cv.width,cv.height);
  const ar=W/H;box=ar>1.1?{cx:ar*.25,cy:.03,h:Math.min(.8,ar*.33)}:{cx:0,cy:-.2,h:Math.min(.48,ar*.62)};   // fits the widest figure (1.4 box-heights) in the free half
  bufs.forEach(b=>gl.deleteBuffer(b));
  bufs=shapes.map((p,k)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,place(p,101+k*7),gl.STATIC_DRAW);return b});
  $('#track').style.height=(S*100)+'vh';bound=-1}
let bound=-1;
const bind=k=>{if(k===bound)return;bound=k;
  [[LA,bufs[k]],[LB,bufs[Math.min(S-1,k+1)]]].forEach(([l,b])=>{gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,4,gl.FLOAT,false,0,0)})};

/* ---------------- scroll → stations, panels, rail ---------------- */
let p=0,pTarget=0,mx=0,my=0,tmx=0,tmy=0;
const rail=[...document.querySelectorAll('.rail a')];
addEventListener('pointermove',e=>{tmx=e.clientX/innerWidth-.5;tmy=e.clientY/innerHeight-.5},{passive:true});
document.addEventListener('click',e=>{const a=e.target.closest('[data-go]');if(!a)return;e.preventDefault();
  scrollTo({top:+a.dataset.go*innerHeight,behavior:reduced?'auto':'smooth'})});
function panelsAt(p){
  panels.forEach((el,k)=>{const d=p-k;const w=d>=0?1-ss(.08,.3,d):ss(-.24,-.08,d);
    el.style.opacity=w.toFixed(3);el.style.setProperty('--dy',((d>=0?-1:1)*(1-w)*40).toFixed(1)+'px');el.classList.toggle('live',w>.5)});
  const k=Math.round(p);$('#cnum').textContent=String(k+1).padStart(2,'0');$('#cname').textContent=panels[Math.min(S-1,k)].dataset.name;
  let on=-1;rail.forEach((a,i)=>{if(+a.dataset.go<=p+.5)on=i});rail.forEach((a,i)=>a.classList.toggle('on',i===on))}

/* ---------------- run ---------------- */
let t0=0,last=0;
function frame(t){
  requestAnimationFrame(frame);
  const dt=Math.min(.1,(t-(last||t))/1000);last=t;const ease=1-Math.exp(-dt*6);   // time-based, so slow frames don't lag behind the scroll
  pTarget=clamp(scrollY/innerHeight,0,S-1);p=reduced?pTarget:p+(pTarget-p)*ease;
  mx+=(tmx-mx)*ease*.5;my+=(tmy-my)*ease*.5;
  const k=Math.min(S-2,Math.floor(p)),f=p-k;
  bind(k);
  const T=reduced?Math.round(f):ss(.28,.92,f);   // hold each formation for the first part of its scroll, then move
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(U('uRes'),W,H);gl.uniform2f(U('uC'),W/2,H/2);gl.uniform1f(U('uScale'),H);
  gl.uniform1f(U('uDot'),box.h*H/F.rows*1.02);gl.uniform1f(U('uT'),T);gl.uniform1f(U('uDpr'),dpr);
  gl.uniform1f(U('uIntro'),reduced?99:(t-t0)/1000);gl.uniform1f(U('uTime'),t/1000);gl.uniform2f(U('uMouse'),mx,my);
  gl.uniform1f(U('uInv'),TH.inv);gl.uniform3f(U('uFg'),...TH.fg.map(v=>v/255));
  gl.uniform1f(U('uAmb'),(TH.inv?.22:.3)*(1-.55*ss(.4,1,p)));   // background dots are quieter once past the hero
  gl.drawArrays(gl.POINTS,0,N);
  panelsAt(p);
}
(async()=>{
  try{await Promise.all(['600 200px "Big Shoulders Display"','500 200px "Big Shoulders Display"'].map(f=>document.fonts.load(f)))}catch(e){}
  shapes=build();N=shapes[0].length+1400;
  // per-dot random: direction for fly-in / transit (unit-ish, so dots start outside the screen), delay, depth jitter
  const r=rng(9445),R=new Float32Array(N*4);
  for(let n=0;n<N;n++){const a=r()*6.283,m=1+r()*.6;R[n*4]=Math.cos(a)*m;R[n*4+1]=Math.sin(a)*m;R[n*4+2]=r();R[n*4+3]=r()*.6}
  const rb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,rb);gl.bufferData(gl.ARRAY_BUFFER,R,gl.STATIC_DRAW);gl.enableVertexAttribArray(LR);gl.vertexAttribPointer(LR,4,gl.FLOAT,false,0,0);
  layout();let rt=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(layout,150)});
  t0=performance.now();requestAnimationFrame(frame);
})();
})();

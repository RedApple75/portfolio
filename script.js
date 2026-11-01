(() => {
const $ = s => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));

/* ---------------- cursor ---------------- */
// ring eases, dot snaps; magnetic targets follow the cursor at .28x/.38y and release with an elastic overshoot
const fine=matchMedia('(hover: hover) and (pointer: fine)').matches&&!reduced;
const ring=$('#ring'),dot=$('#dot'),ringLabel=$('#ringLabel');let mx=-100,my=-100,rx=mx,ry=my,mag=null;
addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;dot.style.transform=`translate(${mx}px,${my}px)`;
  if(mag){const b=mag.getBoundingClientRect();mag.style.transition='transform .5s cubic-bezier(.215,.61,.355,1)';
    mag.style.transform=`translate(${(mx-(b.left+b.width/2))*.28}px,${(my-(b.top+b.height/2))*.38}px)`}},{passive:true});
document.addEventListener('pointerover',e=>{
  const t=e.target,lab=t.closest('[data-cursor]'),hot=t.closest('a,button,input,textarea,label,[role=button]');
  ring.dataset.state=lab?'label':hot?'hover':'';ringLabel.textContent=lab?lab.dataset.cursor:'';
  const m=fine?t.closest('[data-magnetic]'):null;
  if(m!==mag){if(mag){mag.style.transition='transform .7s cubic-bezier(.34,1.8,.5,1)';mag.style.transform=''}mag=m}
});
addEventListener('pointerdown',()=>ring.classList.add('down'));addEventListener('pointerup',()=>ring.classList.remove('down'));
document.documentElement.addEventListener('pointerleave',()=>{ring.style.opacity=dot.style.opacity=0});
document.documentElement.addEventListener('pointerenter',()=>{ring.style.opacity=dot.style.opacity=1});
let rs=1;(function loop(){rx+=(mx-rx)*.16;ry+=(my-ry)*.16;rs+=((ring.classList.contains('down')?.7:1)-rs)*.12;
  ring.style.transform=`translate(${rx}px,${ry}px) scale(${rs.toFixed(3)})`;requestAnimationFrame(loop)})();

/* ---------------- smooth scroll (Lenis, same settings as the original) ---------------- */
let lenis=null;
if(!reduced&&window.Lenis){lenis=new Lenis({duration:1.15,easing:t=>Math.min(1,1.001-Math.pow(2,-10*t)),smoothWheel:true,touchMultiplier:1.6});
  (function raf(t){lenis.raf(t);requestAnimationFrame(raf)})(performance.now());}
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;const id=a.getAttribute('href');if(id==='#')return;
  const el=id==='#top'?document.body:document.querySelector(id);if(!el)return;e.preventDefault();
  lenis?lenis.scrollTo(id==='#top'?0:el,{offset:-64}):el.scrollIntoView({behavior:'smooth'})});

/* ---------------- clock (IST) ---------------- */
const tick=()=>{$('#clock').textContent=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'}).format(new Date())};tick();setInterval(tick,15000);

/* ---------------- marquee ---------------- */
const words=['Optimize','Estimate','Evaluate'];let mq='';
for(let k=0;k<4;k++)words.forEach((w,i)=>{mq+=`<span class="${i===1?'ol':''}">${w}</span><span class="star">✳</span>`});
$('#mq').innerHTML=mq+mq;

/* ---------------- reveal on scroll ---------------- */
// split into words → chars; chars rise from 115% with expo-out and a 22 ms stagger (as the original)
const splitChars=(el,delay=0)=>{const txt=el.textContent;el.setAttribute('aria-label',txt);el.textContent='';let i=0;
  txt.split(' ').forEach((w,wi,arr)=>{const ws=document.createElement('span');ws.className='w';ws.setAttribute('aria-hidden','true');
    for(const ch of w){const c=document.createElement('span');c.className='char';c.textContent=ch;c.style.transitionDelay=(delay+i++*.022)+'s';ws.append(c)}
    el.append(ws);if(wi<arr.length-1)el.append(' ')})};
document.querySelectorAll('.reveal').forEach(el=>{const d=el.closest('.hero')?.15+[...el.parentNode.children].indexOf(el)*.12:0;splitChars(el.firstElementChild||el,d)});
document.querySelectorAll('[data-prox]:not(.h-title)').forEach(el=>splitChars(el));
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:0,rootMargin:'0px 0px -12% 0px'});
document.querySelectorAll('.reveal,.fade,.stat').forEach(el=>io.observe(el));

// proximity weight: each char's 'wght' eases toward min→max by smoothstep(1 − d/radius) — same maths as the original
function proximity(el,{min,max,radius}){
  if(!fine)return;const chars=[...el.querySelectorAll('.char')];if(!chars.length)return;
  const cur=chars.map(()=>min);let pos=[],px=-9999,py=-9999,raf=0,inside=false;
  const measure=()=>{pos=chars.map(c=>{const b=c.getBoundingClientRect();return{x:b.left+b.width/2,y:b.top+b.height/2}})};
  const step=()=>{let moving=false;chars.forEach((c,i)=>{const p=pos[i];if(!p)return;const u=Math.max(0,1-Math.hypot(px-p.x,py-p.y)/radius);
      const target=min+(max-min)*u*u*(3-2*u);cur[i]+=.18*(target-cur[i]);if(Math.abs(target-cur[i])>.5)moving=true;
      c.style.fontVariationSettings=`"wght" ${cur[i].toFixed(0)}`});raf=moving||inside?requestAnimationFrame(step):0};
  addEventListener('pointermove',e=>{px=e.clientX;py=e.clientY;if(!raf){measure();raf=requestAnimationFrame(step)}},{passive:true});
  const host=el.parentElement||el;host.addEventListener('pointerenter',()=>inside=true);host.addEventListener('pointerleave',()=>{inside=false;px=py=-9999});
  addEventListener('scroll',measure,{passive:true});addEventListener('resize',measure);
}
document.querySelectorAll('[data-prox]').forEach(el=>{const[a,b,r]=el.dataset.prox.split(',').map(Number);proximity(el,{min:a,max:b,radius:r})});
document.querySelectorAll('.big:not([data-prox])').forEach(el=>proximity(el,{min:200,max:700,radius:260}));

/* counters */
const count=(el,to,dec,dur=1600)=>{const t0=performance.now();const f=t=>{const p=clamp((t-t0)/dur),e=1-Math.pow(1-p,3);el.textContent=(to*e).toFixed(dec);if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)};
new IntersectionObserver((es,o)=>es.forEach(e=>{if(e.isIntersecting){count($('#cpi'),9.73,2);o.disconnect()}}),{threshold:.4}).observe($('#stat'));
new IntersectionObserver((es,o)=>es.forEach(e=>{if(e.isIntersecting){count($('#stackn'),document.querySelectorAll('.skills .tag').length,0,900);o.disconnect()}}),{threshold:.3}).observe($('.skills'));

/* nav active state + to-top */
const secs=['about','projects','lab','contact'].map(id=>document.getElementById(id));
addEventListener('scroll',()=>{
  const y=scrollY+innerHeight*.35;let cur='';secs.forEach(s=>{if(s.offsetTop<=y)cur=s.id});
  document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===cur));
  $('#totop').classList.toggle('show',scrollY>innerHeight);
},{passive:true});

/* =====================================================================
   DITHERED F1 TYRE — WebGL raymarch + 8x8 Bayer dither (same pipeline as
   the original's blob: mouse-driven rotation & light, finer "loupe" grain
   near the cursor, twinkling dithered starfield, rises/fades on scroll)
   ===================================================================== */
const TYRE_FS=`
precision highp float;
uniform float uTime,uHover,uScroll,uPixel,uIntro,uCenter,uShape,uBg;
uniform vec2 uRes,uMouse,uCloud;
const vec3 INK=vec3(5.,5.,5.)/255., PAPER=vec3(242.,242.,238.)/255., RED=vec3(225.,6.,0.)/255.;
const float S=.28, RO=1., RI=.64, HW=.60, CR=.18, RIM=.46;

float bayer2(vec2 a){a=floor(a);return fract(a.x/2.+a.y*a.y*.75);}
float bayer4(vec2 a){return bayer2(.5*a)*.25+bayer2(a);}
float bayer8(vec2 a){return bayer4(.5*a)*.25+bayer2(a);}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float sdBox2(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}

// world -> tyre-local (axle = local x). Wide range of motion from the mouse.
vec3 orient(vec3 p){
  p.yz*=rot(-.30+uMouse.y*1.9);                    // pitch (about screen x) — tilts the axle up/down
  p.xz*=rot(.95+sin(uTime*.25)*.25+uMouse.x*2.4);  // yaw   (about screen y)
  p.xy*=rot(uMouse.x*uMouse.y*1.2+sin(uTime*.4)*.15); // roll — third degree of freedom
  return p/(S*mix(.15,1.,uIntro)*(1.-uScroll*.3));
}
float map(vec3 p,out float mat){
  float k=S*mix(.15,1.,uIntro)*(1.-uScroll*.3);
  vec3 q=orient(p);float r=length(q.yz);
  float dT=sdBox2(vec2(r-(RO+RI)*.5,q.x),vec2((RO-RI)*.5,HW),CR);
  float dR=sdBox2(vec2(r-RI*.5,q.x),vec2(RI*.5,RIM-.03*r/RI),.02);
  mat=dT<dR?0.:1.;return min(dT,dR)*k;
}
float mapD(vec3 p){float m;return map(p,m);}
vec3 normalAt(vec3 p){const vec2 k=vec2(1.,-1.);const float h=.0015;
  return normalize(k.xyy*mapD(p+k.xyy*h)+k.yyx*mapD(p+k.yyx*h)+k.yxy*mapD(p+k.yxy*h)+k.xxx*mapD(p+k.xxx*h));}

void main(){
  vec2 frag=gl_FragCoord.xy, mousePx=(uMouse*.5+.5)*uRes;
  float dm=length(frag-mousePx)/uRes.y;
  // loupe: grain gets finer around the cursor (the "dots grow/shrink on hover")
  float px=max(1.,floor(uPixel*mix(.5644,1.,smoothstep(.04,.22,dm/(.4+uHover*.6)))));
  vec2 cell=floor(frag/px), c=(cell+.5)*px;
  vec2 uv=(c-.5*uRes)/min(uRes.x,uRes.y);
  float aspect=uRes.x/uRes.y;
  if(aspect<1.2){uv.y-=.2*(uRes.y/uRes.x)*(1.-uCenter);uv*=mix(1.3,1.,uCenter);}
  else{uv-=vec2(.26,.06)*(1.-uCenter);}
  uv-=uMouse*vec2(.16,.11)*(1.-uCenter*.5);   // tyre drifts toward the pointer
  uv.y+=uScroll*.45;

  vec3 ro=vec3(0.,0.,3.1), rd=normalize(vec3(uv,-1.75));
  float t=0., hit=0., mat=0.;
  if(uShape>.5)   // uShape=0: background lattice only (hero, where the portrait sits on top)
  for(int i=0;i<56;i++){float m;float d=map(ro+rd*t,m);if(d<.002){hit=1.;mat=m;break;}t+=d*.9;if(t>6.)break;}

  float lum, red=0.;
  if(hit>.5){
    vec3 p=ro+rd*t, n=normalAt(p);
    vec3 l=normalize(vec3(uMouse.x*1.4-.6,uMouse.y*1.2+.7,.9));
    float diff=max(dot(n,l),0.), rim=pow(1.-max(dot(n,-rd),0.),3.);
    vec3 q=orient(p); float r=length(q.yz);
    float ang=atan(q.z,q.y)+uTime*1.6;                  // rolling
    if(mat<.5){
      lum=.05+diff*.78+rim*.35;
      if(abs(q.x)>HW-.04){                               // sidewall
        if(r>.80&&r<.86) red=1.;                         // compound band
        float a=mod(ang,.7854);
        if(r>.69&&r<.76&&a<.32) lum+=.32;                // generic sidewall marks
      } else lum*=.82+.18*step(.2,fract(ang*3.82));      // faint wear lines on the tread
    } else {
      float spokes=step(.82,abs(sin(ang*5.)));
      lum=.10+diff*.75+rim*.25+spokes*.25;
      if(r<RI*.14) lum=.95;
    }
  }
  lum*=1.-uScroll*.55;
  float on=step(bayer8(cell),clamp(lum,0.,1.)*.98);
  if(hit<.5){
    // background: one regular lattice of square dots whose spacing halves in steps toward the pointer
    float GS=17.*(uPixel/4.), GD=max(1.,floor(3.*(uPixel/4.)+.5));
    float dc=length(frag-(uCloud*.5+.5)*uRes)/uRes.y+(fract(sin(dot(floor(frag/GS)+3.1,vec2(12.9898,78.233)))*43758.5453)-.5)*.012;
    float lvl=uHover>.5?(dc<.03?3.:dc<.08?2.:dc<.125?1.:0.):0.;
    float sp=GS/exp2(lvl), ds=max(1.,floor(GD*pow(.35,lvl)+.5));
    vec2 gc=floor(frag/sp), lc=mod(frag,sp);
    float h=fract(sin(dot(gc+lvl*17.,vec2(12.9898,78.233)))*43758.5453);
    float tw=lvl>0.?1.:mix(1.,step(.5,.5+.5*sin(uTime*1.2+h*40.)),.48);
    on=step(lc.x,ds)*step(lc.y,ds)*step(h,lvl>0.?1.:.68)*tw*(lvl>0.?1.:.75)*(1.-uScroll*.6)*uBg;
  }
  vec3 col=red>.5?mix(vec3(.16,0.,0.),RED,on):mix(INK,PAPER,on);
  gl_FragColor=vec4(col,1.);
}`;
function makeTyre(canvas,{centered=false,scrollLinked=true,shape=true,bg=1}={}){
  const gl=canvas.getContext('webgl',{antialias:false,alpha:false,powerPreference:'high-performance'});
  if(!gl)return;
  const sh=(type,src)=>{const o=gl.createShader(type);gl.shaderSource(o,src);gl.compileShader(o);
    if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(o));return o};
  const prog=gl.createProgram();
  gl.attachShader(prog,sh(gl.VERTEX_SHADER,'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}'));
  gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,TYRE_FS));gl.linkProgram(prog);gl.useProgram(prog);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(prog,'position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const U=n=>gl.getUniformLocation(prog,n);
  const coarse=matchMedia('(max-width: 768px)').matches||matchMedia('(hover: none)').matches;
  const dpr=coarse?.25:Math.min(devicePixelRatio||1,1.75);
  if(coarse)canvas.style.imageRendering='pixelated';
  const st={time:0,cloud:[.2,.1],mouse:[.2,.1],target:[.2,.1],hover:0,hoverT:0,intro:0,scroll:0};
  const resize=()=>{const b=canvas.getBoundingClientRect();canvas.width=Math.max(1,Math.round(b.width*dpr));canvas.height=Math.max(1,Math.round(b.height*dpr));
    gl.viewport(0,0,canvas.width,canvas.height)};
  resize();new ResizeObserver(resize).observe(canvas);
  addEventListener('pointermove',e=>{const b=canvas.getBoundingClientRect();st.target=[clamp((e.clientX-b.left)/b.width*2-1,-1.4,1.4),clamp(-((e.clientY-b.top)/b.height*2-1),-1.4,1.4)];st.hoverT=1},{passive:true});
  document.addEventListener('pointerleave',()=>st.hoverT=0);
  let vis=true;new IntersectionObserver(([e])=>vis=e.isIntersecting).observe(canvas);
  const scrollP=()=>scrollLinked?clamp(scrollY/(canvas.offsetHeight||1)):0;
  const draw=()=>{gl.uniform1f(U('uTime'),st.time);gl.uniform2f(U('uRes'),canvas.width,canvas.height);gl.uniform2fv(U('uMouse'),st.mouse);gl.uniform2fv(U('uCloud'),st.cloud);
    gl.uniform1f(U('uHover'),st.hover);gl.uniform1f(U('uScroll'),st.scroll);gl.uniform1f(U('uPixel'),coarse?1:4*dpr);
    gl.uniform1f(U('uIntro'),st.intro);gl.uniform1f(U('uCenter'),centered?1:0);gl.uniform1f(U('uShape'),shape?1:0);gl.uniform1f(U('uBg'),bg);gl.drawArrays(gl.TRIANGLES,0,3)};
  if(reduced){st.intro=1;st.time=4;draw();addEventListener('scroll',()=>{st.scroll=scrollP();draw()},{passive:true});return}
  const t0=performance.now();let last=0;
  (function frame(t){requestAnimationFrame(frame);if(!vis||(coarse&&t-last<32))return;last=t;
    st.time=(t-t0)/1000;
    st.mouse=[st.mouse[0]+.09*(st.target[0]-st.mouse[0]),st.mouse[1]+.09*(st.target[1]-st.mouse[1])];
    st.cloud=[st.cloud[0]+.15*(st.target[0]-st.cloud[0]),st.cloud[1]+.15*(st.target[1]-st.cloud[1])];
    st.hover+=.04*(st.hoverT-st.hover);st.intro+=.035*(1-st.intro);st.scroll=scrollP();draw()})(t0);
}
makeTyre($('#tyre'),{shape:false,bg:.55});   // hero: lattice only, dimmed so the portrait reads
makeTyre($('#tyre2'),{centered:true,scrollLinked:false});

/* =====================================================================
   PORTRAIT — square pixels in 3D (data: face-data.js, one byte per cell)
   Every pixel sits on the line from the camera through its cell of the
   portrait, at its own depth, so at rest the field projects into one flat
   face. On load they fly in from outside the screen (~3 s); the pointer
   shifts the camera a little (the depth shows), scrolling flies it forward
   and the face comes apart.
   ===================================================================== */
const FACE_VS=`
attribute vec2 aCell;attribute vec3 aStart;attribute vec3 aMisc;   // misc: brightness, depth, delay
uniform vec2 uRes,uC;uniform vec3 uCam;uniform float uCell,uTime,uDpr;
varying float vA;
void main(){
  float lum=aMisc.x,d=aMisc.y,del=aMisc.z;
  float t=clamp((uTime-del)/1.6,0.,1.),e=1.-pow(1.-t,4.);           // each pixel: 1.6 s, quartic ease-out
  vec3 rest=vec3(aCell*uCell*d,d);                                   // world: screen px x depth (1 = picture plane)
  vec3 w=mix(aStart,rest,e);
  float z=w.z-uCam.z;
  vec2 s=uC+(w.xy-uCam.xy)/max(z,.001);
  gl_Position=vec4(s/uRes*2.-1.,0.,1.);gl_Position.y*=-1.;
  gl_PointSize=z>.02?max(1.,uCell*(.28+.62*lum)*w.z/z*uDpr):0.;
  vA=(.28+.72*lum)*smoothstep(.04,.3,z)*smoothstep(0.,.25,t);
}`;
const FACE_FS=`precision mediump float;varying float vA;
void main(){gl_FragColor=vec4(vec3(239.,237.,230.)/255.*vA,vA);}`;   // premultiplied paper
(function face(){
  const cv=$('#face'),F=window.FACE;if(!cv||!F)return;
  const gl=cv.getContext('webgl',{antialias:false,alpha:true,premultipliedAlpha:true});if(!gl)return;
  const sh=(type,src)=>{const o=gl.createShader(type);gl.shaderSource(o,src);gl.compileShader(o);
    if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(o));return o};
  const prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,FACE_VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FACE_FS));
  gl.linkProgram(prog);gl.useProgram(prog);
  // cells → attributes; positions are relative to row FY (the eyes), which is what gets placed on screen
  const bytes=Uint8Array.from(atob(F.data),c=>c.charCodeAt(0)),FY=50;
  const rnd=(s=>()=>(s=(s*16807)%2147483647)/2147483647)(9445);
  const cell=[],dir=[],misc=[];
  for(let j=0;j<F.rows;j++)for(let i=0;i<F.cols;i++){const b=bytes[j*F.cols+i];if(!b)continue;
    const a=rnd()*Math.PI*2,r=1.6+rnd()*2.2,d0=.12+rnd()*.35;           // start: close to the camera, well off-screen
    cell.push(i-F.cols/2+.5,j-FY);dir.push(Math.cos(a)*r,Math.sin(a)*r,d0);
    misc.push((b-1)/254,.75+rnd()*.6,rnd()*.9+Math.hypot(i-F.cols/2,j-FY)/F.rows*.5)}   // brightness, depth, delay (centre lands first)
  const N=cell.length/2,start=new Float32Array(N*3);
  const attr=(name,arr,n)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,arr instanceof Float32Array?arr:new Float32Array(arr),gl.STATIC_DRAW);
    const l=gl.getAttribLocation(prog,name);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,gl.FLOAT,false,0,0);return b};
  attr('aCell',cell,2);const sb=attr('aStart',start,3);attr('aMisc',misc,3);
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  const U=n=>gl.getUniformLocation(prog,n);
  const dpr=Math.min(devicePixelRatio||1,2);let W=1,H=1,C=[0,0],CELL=6;
  const resize=()=>{const b=cv.getBoundingClientRect();W=b.width;H=b.height;cv.width=Math.max(1,W*dpr|0);cv.height=Math.max(1,H*dpr|0);gl.viewport(0,0,cv.width,cv.height);
    if(W/H>=1.2){CELL=Math.min(H*1.02/F.rows,W*.42/F.cols);C=[Math.min(W/2+.26*H,W*.97-F.cols*CELL/2),H*.08+FY*CELL]}   // wide: where the tyre was
    else{CELL=Math.min(H*.8/F.rows,W*.92/F.cols);C=[W/2,H*.1+FY*CELL]}                                                 // narrow: centred
    // starts scale with the screen so pixels always come from outside it
    const k=Math.max(W,H)*.55;for(let n=0;n<N;n++){const d0=dir[n*3+2];start[n*3]=dir[n*3]*k*d0;start[n*3+1]=dir[n*3+1]*k*d0;start[n*3+2]=d0}
    gl.bindBuffer(gl.ARRAY_BUFFER,sb);gl.bufferData(gl.ARRAY_BUFFER,start,gl.STATIC_DRAW)};
  resize();new ResizeObserver(resize).observe(cv);
  let vis=true;new IntersectionObserver(([e])=>vis=e.isIntersecting).observe(cv);
  let tx=0,ty=0,cx=0,cy=0;
  addEventListener('pointermove',e=>{tx=(e.clientX/innerWidth-.5)*2;ty=(e.clientY/innerHeight-.5)*2},{passive:true});
  const draw=time=>{const sp=clamp(scrollY/(cv.offsetHeight||1));
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U('uRes'),W,H);gl.uniform2fv(U('uC'),C);gl.uniform1f(U('uCell'),CELL);gl.uniform1f(U('uDpr'),dpr);gl.uniform1f(U('uTime'),time);
    gl.uniform3f(U('uCam'),(cx*2.2+Math.sin(time*.3)*.3)*CELL,(cy*1.6+Math.cos(time*.23)*.2)*CELL,sp*.7);   // pointer parallax + idle drift; scroll flies forward
    gl.drawArrays(gl.POINTS,0,N)};
  if(reduced){const d=()=>draw(99);d();addEventListener('scroll',d,{passive:true});new ResizeObserver(d).observe(cv);return}
  const t0=performance.now();
  (function frame(t){requestAnimationFrame(frame);if(!vis)return;
    cx+=.05*(tx-cx);cy+=.05*(ty-cy);draw((t-t0)/1000)})(t0);
})();

/* =====================================================================
   PROJECTS — pinned horizontal scroll, dithered procedural previews
   ===================================================================== */
const projects=[
  {k:'Research · 2026',t:'Fair Evaluation of LLMs',d:'Benchmarking how large language models perform across Indian languages, and what "fair" comparison means when data and scripts differ.',tags:['LLM evaluation','Multilingual','PyTorch'],art:'bars'},
  {k:'Research · 2026',t:'Graph-Based Hallucination Detection',d:'Turning model outputs into graphs of claims to flag unsupported statements; multilingual LoRA experiments on IITB\'s HPC cluster.',tags:['Graphs','LoRA','HPC'],art:'graph'},
  {k:'Project · Prof. Vishnu Narayanan',t:'BLADE — MIP-Trained BNNs',d:'Training binarised neural networks with mixed-integer programming instead of gradient descent.',tags:['MIP','Optimization','BNN'],art:'grid'},
  {k:'Model · 2026',t:'Bihar Prohibition, Simulated',d:'A system-dynamics model of Bihar\'s 2016 alcohol prohibition — stocks, flows and unintended feedback loops.',tags:['System dynamics','Policy','Simulation'],art:'flow'},
  {k:'Team · IITB Rocket Team',t:'Flight Telemetry System',d:'Avionics for a student rocket: sensor data from the flight computer, down a radio link, to a live ground display.',tags:['Embedded','Telemetry','C/C++'],art:'wave'},
];
const track=$('#ptrack');
projects.forEach((p,i)=>{const el=document.createElement('article');el.className='pcard';el.innerHTML=
 `<div class="meta"><span class="label"><b>${String(i+1).padStart(2,'0')}</b> / ${String(projects.length).padStart(2,'0')}</span><span class="label">${p.k}</span></div>
  <canvas data-art="${p.art}" data-cursor="View"></canvas>
  <div class="info"><h3>${p.t}</h3><div><p>${p.d}</p><div class="tags">${p.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div><div style="display:flex;gap:10px"><a data-magnetic class="btn solid" href="#">View details</a><a data-magnetic class="btn" href="#">Code ↗</a></div></div></div>`;track.append(el)});
$('#pcount').textContent=`01 / ${String(projects.length).padStart(2,'0')}`;

function art(kind,w,h,t){ // returns luminance function data via offscreen canvas
  const c=art.c||(art.c=document.createElement('canvas'));c.width=w;c.height=h;const g=c.getContext('2d');
  g.fillStyle='#000';g.fillRect(0,0,w,h);g.strokeStyle=g.fillStyle='#fff';
  const rnd=(s=>()=>(s=(s*16807)%2147483647)/2147483647)(kind.length*977);
  if(kind==='bars'){const n=14;for(let i=0;i<n;i++){const v=.25+.7*Math.abs(Math.sin(i*1.7+t*.0006+i*i*.1));const bw=w/n*.6;g.globalAlpha=.35+.65*v;g.fillRect(w*.06+i*w*.88/n,h*.9-v*h*.75,bw,v*h*.75)}}
  if(kind==='graph'){const pts=[...Array(26)].map(()=>[rnd()*w*.9+w*.05,rnd()*h*.8+h*.1]);g.lineWidth=1;g.globalAlpha=.5;pts.forEach((a,i)=>pts.forEach((b,j)=>{if(j>i&&Math.hypot(a[0]-b[0],a[1]-b[1])<w*.2){g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke()}}));g.globalAlpha=1;pts.forEach((p,i)=>{const r=3+3*Math.sin(t*.002+i);g.beginPath();g.arc(p[0],p[1],Math.max(1.5,r),0,7);g.fill()})}
  if(kind==='grid'){const n=10;for(let i=0;i<n;i++)for(let j=0;j<6;j++){const on=Math.sin(i*3.1+j*1.7+Math.floor(t/700))>0;g.globalAlpha=on?1:.18;g.fillRect(w*.1+i*w*.08,h*.15+j*h*.12,w*.06,h*.09)}}
  if(kind==='flow'){g.lineWidth=2;const xs=[.18,.5,.82];xs.forEach((x,i)=>{g.globalAlpha=.9;g.strokeRect(w*x-w*.09,h*.38,w*.18,h*.24);const lvl=.5+.45*Math.sin(t*.0012+i*2);g.globalAlpha=.6;g.fillRect(w*x-w*.09,h*.62-h*.24*lvl,w*.18,h*.24*lvl)});g.globalAlpha=.8;g.beginPath();g.moveTo(w*.27,h*.5);g.lineTo(w*.41,h*.5);g.moveTo(w*.59,h*.5);g.lineTo(w*.73,h*.5);g.stroke();g.beginPath();g.ellipse(w*.5,h*.5,w*.38,h*.36,0,Math.PI*1.1,Math.PI*1.9);g.stroke()}
  if(kind==='wave'){g.lineWidth=2;for(let k=0;k<3;k++){g.globalAlpha=1-k*.3;g.beginPath();for(let x=0;x<w;x+=2){const y=h*(.3+k*.22)+Math.sin(x*.03*(k+1)+t*.003)*h*.07*(1+Math.sin(x*.005));x?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}}
  return g.getImageData(0,0,w,h).data;
}
const bay=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16);
const pcs=[...document.querySelectorAll('.pcard canvas')];
function drawPreview(cv,t){
  const b=cv.getBoundingClientRect();if(b.right<0||b.left>innerWidth)return;
  const dpr=Math.min(devicePixelRatio||1,2),W=cv.width=b.width*dpr|0,H=cv.height=b.height*dpr|0;if(!W||!H)return;
  const cell=4*dpr,cols=W/cell|0,rows=H/cell|0;const d=art(cv.dataset.art,cols,rows,t);const g=cv.getContext('2d');
  g.fillStyle='#000';g.fillRect(0,0,W,H);
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const v=d[(j*cols+i)*4]/255;const q=Math.floor(v*3+bay[(j&3)*4+(i&3)])/3;if(q<=0)continue;
    const s=cell*(.3+.6*q);g.fillStyle=`rgba(239,237,230,${.3+.7*q})`;g.fillRect(i*cell+(cell-s)/2,j*cell+(cell-s)/2,s,s)}
}
const projSec=$('#projects'),pin=$('.pin');
function layoutProjects(){projSec.style.height=(track.scrollWidth-innerWidth+innerHeight)+'px'}
function onProj(){
  const r=projSec.getBoundingClientRect(),max=track.scrollWidth-innerWidth;
  const p=clamp(-r.top/Math.max(1,projSec.offsetHeight-innerHeight));
  track.style.transform=`translateX(${-p*max}px)`;
  $('#pcount').textContent=`${String(Math.min(projects.length,1+Math.round(p*(projects.length-1)))).padStart(2,'0')} / ${String(projects.length).padStart(2,'0')}`;
}
let pt=0;(function pl(t){if(t-pt>80){pcs.forEach(c=>drawPreview(c,t));pt=t}if(!reduced)requestAnimationFrame(pl)})(0);
addEventListener('scroll',onProj,{passive:true});addEventListener('resize',()=>{layoutProjects();onProj()});
layoutProjects();onProj();

/* =====================================================================
   CONTACT — dotted sphere   |   FOOTER — ridgeline
   ===================================================================== */
(function sphere(){const cv=$('#dots'),g=cv.getContext('2d');let W,H;const rs=()=>{const b=cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);W=cv.width=b.width*d;H=cv.height=b.height*d};rs();addEventListener('resize',rs);
  const pts=[];for(let i=0;i<2200;i++){const y=1-2*(i+.5)/2200,r=Math.sqrt(1-y*y),a=i*2.399963;pts.push([Math.cos(a)*r,y,Math.sin(a)*r])}
  (function f(t){g.clearRect(0,0,W,H);const R=W*.42,c=Math.cos(t*.00015),s=Math.sin(t*.00015);
    for(const[x,y,z]of pts){const X=x*c-z*s,Z=x*s+z*c;if(Z<-.1)continue;const land=Math.sin(x*4.1+y*2)*Math.cos(z*3.3-y*1.4)>.15;const a=(land?.75:.18)*(.3+.7*Z);g.fillStyle=`rgba(239,237,230,${a})`;const sz=(land?2.6:1.6)*(W/700);g.fillRect(W/2+X*R,H/2-y*R,sz,sz)}
    if(!reduced)requestAnimationFrame(f)})(0)})();

/* ---------------- footer: clustered network (communities around hubs) ----------------
   Pixel-snapped square nodes, 1px arcs, packets on inter-hub links.
   Pointer gently pushes nodes away; hovering a community lights it up in red. */
(function net(){
  const cv=$('#ridge'),g=cv.getContext('2d');let W,H,D=1,vis=false,mx=-1e4,my=-1e4;
  const rnd=(s=>()=>(s=(s*16807)%2147483647)/2147483647)(424);
  const nodes=[],edges=[],hubs=[];const K=7;
  // hubs spread across a wide band, then leaves scattered around each hub
  for(let k=0;k<K;k++){const h={ux:.08+.84*(k+.5)/K+(rnd()-.5)*.06,uy:.3+rnd()*.4,hub:true,c:k,deg:0};hubs.push(h);nodes.push(h)}
  hubs.forEach(h=>{const n=9+Math.floor(rnd()*12),R=.055+rnd()*.035;
    for(let i=0;i<n;i++){const a=rnd()*Math.PI*2,r=R*(.35+.65*Math.sqrt(rnd()));
      const v={ux:h.ux+Math.cos(a)*r,uy:h.uy+Math.sin(a)*r*2.6,c:h.c,deg:0};nodes.push(v);edges.push({a:h,b:v})}});
  const members=k=>nodes.filter(n=>n.c===k&&!n.hub);
  // a few intra-community links, hub–hub backbone, sparse cross links
  hubs.forEach(h=>{const m=members(h.c);for(let i=0;i<3;i++){const a=m[Math.floor(rnd()*m.length)],b=m[Math.floor(rnd()*m.length)];if(a!==b)edges.push({a,b})}});
  for(let k=0;k<K-1;k++)edges.push({a:hubs[k],b:hubs[k+1],trunk:true});
  for(let i=0;i<3;i++){const a=hubs[Math.floor(rnd()*K)],b=hubs[Math.floor(rnd()*K)];if(a!==b)edges.push({a,b,trunk:true})}
  for(let i=0;i<8;i++){const a=nodes[K+Math.floor(rnd()*(nodes.length-K))],b=hubs[Math.floor(rnd()*K)];if(a.c!==b.c)edges.push({a,b,cross:true})}
  // isolated periphery nodes
  for(let i=0;i<70;i++)nodes.push({ux:rnd(),uy:.04+rnd()*.92,c:-1,deg:0,iso:true});
  edges.forEach(e=>{e.a.deg++;e.b.deg++;e.ph=rnd()});
  nodes.forEach(n=>{n.ph=rnd()*6.28;n.dx=0;n.dy=0});
  const rs=()=>{const b=cv.getBoundingClientRect();D=Math.min(devicePixelRatio||1,2);W=cv.width=b.width*D;H=cv.height=b.height*D};
  rs();addEventListener('resize',rs);
  new IntersectionObserver(e=>vis=e[0].isIntersecting).observe(cv);
  addEventListener('pointermove',e=>{const b=cv.getBoundingClientRect();mx=(e.clientX-b.left)*D;my=(e.clientY-b.top)*D},{passive:true});
  cv.parentElement.addEventListener('pointerleave',()=>{mx=my=-1e4});
  const snap=v=>Math.round(v/(2*D))*2*D;
  let hot=-1,heat=new Array(K).fill(0);
  (function f(t){
    if(vis){
      const top=H*.08,span=H*.58,ts=t*.001;
      // positions: gentle drift + soft repulsion from the pointer
      nodes.forEach(n=>{let x=n.ux*W+Math.sin(ts*.6+n.ph)*3*D,y=top+n.uy*span+Math.cos(ts*.5+n.ph)*3*D;
        const dx=x-mx,dy=y-my,d=Math.hypot(dx,dy),R=110*D;let tx=0,ty=0;
        if(d<R&&d>0){const k=(1-d/R)**2*26*D;tx=dx/d*k;ty=dy/d*k}
        n.dx+=(tx-n.dx)*.12;n.dy+=(ty-n.dy)*.12;n.x=x+n.dx;n.y=y+n.dy});
      // hovered community = nearest hub within reach
      let best=-1,bd=1e9;hubs.forEach(h=>{const d=Math.hypot(h.x-mx,h.y-my);if(d<bd){bd=d;best=h.c}});
      hot=bd<140*D?best:-1;heat=heat.map((v,k)=>v+((k===hot?1:0)-v)*.1);
      g.fillStyle='#050505';g.fillRect(0,0,W,H);
      g.lineWidth=D;
      edges.forEach(e=>{const h=e.a.c>=0&&e.a.c===e.b.c?heat[e.a.c]:0;
        g.strokeStyle=e.trunk?`rgba(239,237,230,${.28})`:`rgba(${h>.05?'225,60,50':'239,237,230'},${(e.cross?.07:.13)+.45*h})`;
        g.beginPath();g.moveTo(e.a.x,e.a.y);g.lineTo(e.b.x,e.b.y);g.stroke()});
      // packets along the backbone and some spokes
      edges.forEach(e=>{if(!e.trunk&&e.ph>.35)return;const u=(ts*(e.trunk?.12:.25)+e.ph)%1;
        const x=e.a.x+(e.b.x-e.a.x)*u,y=e.a.y+(e.b.y-e.a.y)*u,s=(e.trunk?3:2)*D;
        g.fillStyle=e.trunk?'#efede6':'rgba(239,237,230,.6)';g.fillRect(snap(x)-s/2,snap(y)-s/2,s,s)});
      nodes.forEach(n=>{const h=n.c>=0?heat[n.c]:0;
        let s=n.hub?8:n.iso?3:Math.min(5,2+n.deg);s*=D;
        const tw=n.iso?.45+.3*Math.sin(ts*1.5+n.ph*3):1;
        if(n.hub){g.fillStyle='#050505';g.fillRect(snap(n.x)-s/2,snap(n.y)-s/2,s,s);g.strokeStyle=h>.05?'#e10600':'#efede6';g.strokeRect(snap(n.x)-s/2+.5,snap(n.y)-s/2+.5,s-1,s-1);
          g.fillStyle=h>.05?'#e10600':'#efede6';g.fillRect(snap(n.x)-D,snap(n.y)-D,2*D,2*D)}
        else{g.fillStyle=h>.05?`rgba(225,6,0,${.5+.5*h})`:`rgba(239,237,230,${n.iso?tw:.75})`;g.fillRect(snap(n.x)-s/2,snap(n.y)-s/2,s,s)}});
      g.font=`${10*D}px "Geist Mono",monospace`;
      if(hot>=0){const h=hubs[hot],m=members(hot).length;g.fillStyle=`rgba(239,237,230,${heat[hot]})`;
        g.fillText(`C${hot+1} · HUB DEG ${h.deg} · |V| ${m+1}`,h.x+10*D,h.y-10*D)}
      g.fillStyle='rgba(239,237,230,.45)';
      g.fillText(`GRAPH · n=${nodes.length} · m=${edges.length} · k=${K} COMMUNITIES`,16*D,18*D);
    }
    if(!reduced)requestAnimationFrame(f)})(0);
})();

/* form — no backend yet */
$('#f3').addEventListener('input',e=>$('#cc').textContent=e.target.value.length);
$('#form').addEventListener('submit',e=>{e.preventDefault();$('#note').textContent='Form not connected yet — email me directly.'});
})();

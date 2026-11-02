(() => {
const $ = s => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));

/* ---------------- colour mode (cream + F1 red by default, dark as the alternative) ---------------- */
// canvases read TH every frame; css follows html[data-theme] (set before paint by the inline script in <head>)
const THEMES={light:{bg:[236,232,222],fg:[38,34,30],inv:1},dark:{bg:[5,5,5],fg:[239,237,230],inv:0}};
const root=document.documentElement;
let TH=THEMES[root.dataset.theme]||THEMES.dark;
const rgba=(c,a=1)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
const setMode=m=>{root.dataset.theme=m;TH=THEMES[m];$('#modeLabel').textContent=m==='dark'?'Dark':'Light';
  try{localStorage.setItem('rb-theme',m)}catch(e){}dispatchEvent(new Event('themechange'))};
setMode(root.dataset.theme==='light'?'light':'dark');
$('#mode').addEventListener('click',()=>setMode(root.dataset.theme==='dark'?'light':'dark'));


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
const lockScroll=on=>{root.classList.toggle('locked',on);if(lenis)on?lenis.stop():lenis.start()};
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;const id=a.getAttribute('href');if(id==='#')return;
  const el=id==='#top'?document.body:document.querySelector(id);if(!el)return;e.preventDefault();
  lenis?lenis.scrollTo(id==='#top'?0:el,{offset:-64}):el.scrollIntoView({behavior:'smooth'})});



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
new IntersectionObserver((es,o)=>es.forEach(e=>{if(e.isIntersecting){count($('#stackn'),document.querySelectorAll('.skills .tag').length,0,900);o.disconnect()}}),{threshold:.3}).observe($('.skills'));

/* nav active state + to-top */
const secs=['about','experience','projects','contact'].map(id=>document.getElementById(id));
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
uniform float uTime,uHover,uScroll,uPixel,uIntro,uCenter,uShape,uBg,uInv,uOut,uFace,uSlide,uNut;
uniform vec3 uBgC,uFgC,uBand;   // pit stop: uFace turns the sidewall to camera, uSlide moves the wheel, uBand = compound colour
uniform vec2 uRes,uMouse,uCloud;
const vec3 RED=vec3(225.,6.,0.)/255.;
const float S=.28, RO=1., RI=.64, HW=.60, CR=.18, RIM=.46;

float bayer2(vec2 a){a=floor(a);return fract(a.x/2.+a.y*a.y*.75);}
float bayer4(vec2 a){return bayer2(.5*a)*.25+bayer2(a);}
float bayer8(vec2 a){return bayer4(.5*a)*.25+bayer2(a);}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float sdBox2(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}

// world -> tyre-local (axle = local x). Wide range of motion from the mouse.
vec3 orient(vec3 p){
  p.yz*=rot(mix(-.30+uMouse.y*1.9,0.,uFace));                    // pitch (about screen x) — tilts the axle up/down
  p.xz*=rot(mix(.95+sin(uTime*.25)*.25+uMouse.x*2.4,1.5708,uFace));  // yaw   (about screen y)
  p.xy*=rot(mix(uMouse.x*uMouse.y*1.2+sin(uTime*.4)*.15,0.,uFace)); // roll — third degree of freedom
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
  uv.x-=uSlide;

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
    float ang=atan(q.z,q.y)+uTime*1.6*(1.-uFace);      // rolling (stops in the pit box)
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
      if(uNut>.5&&r<RI*.24) red=1.;                     // wheel nut lit up when it is the target
    }
  }
  lum*=1.-uScroll*.55;
  float lit=step(bayer8(cell),clamp(lum,0.,1.)*.98);
  float on=uInv>.5?1.-lit:lit;   // light mode prints like ink on paper: dots where the tyre is dark
  if(hit<.5&&uBg<.001){gl_FragColor=vec4(0.);return;}   // shape only: transparent around it, the site-wide lattice shows through
  if(hit<.5){
    // background: one regular lattice of square dots whose spacing halves in steps toward the pointer
    float GS=17.*(uPixel/4.), GD=max(1.,floor(3.*(uPixel/4.)+.5));
    float dc=length(frag-(uCloud*.5+.5)*uRes)/uRes.y+(fract(sin(dot(floor(frag/GS)+3.1,vec2(12.9898,78.233)))*43758.5453)-.5)*.012;
    float lvl=uHover>.5?(dc<.03?3.:dc<.08?2.:dc<.125?1.:0.):0.;
    float sp=GS/exp2(lvl), ds=max(1.,floor(GD*pow(.35,lvl)+.5));
    vec2 gc=floor(frag/sp), lc=mod(frag,sp);
    float h=fract(sin(dot(gc+lvl*17.,vec2(12.9898,78.233)))*43758.5453);
    // past the hero (uOut 0→1) the dots get out of the way of the text: a dimmer, b sparser, c still
    float o0=lvl>0.?0.:uOut;
    float dim=mix(1.,.28,o0);
    float tw=lvl>0.?1.:mix(1.,step(.5,.5+.5*sin(uTime*1.2+h*40.)),.48);
    on=step(lc.x,ds)*step(lc.y,ds)*step(h,lvl>0.?1.:.68)*tw*(lvl>0.?1.:.75)*dim*(1.-uScroll*.6)*uBg*mix(1.,.6,uInv);   // lighter grid on cream
  }
  vec3 col=red>.5?mix(uInv>.5?uBgC:uBand*.16,uNut>.5&&hit>.5&&mat>.5?RED:uBand,lit):mix(uBgC,uFgC,on);
  gl_FragColor=vec4(col,1.);
}`;
function makeTyre(canvas,{centered=false,scrollLinked=true,shape=true,bg=1,fadeOut=false,game=false}={}){
  const gl=canvas.getContext('webgl',{antialias:false,alpha:true,powerPreference:'high-performance',preserveDrawingBuffer:shape});   // shape canvases can be read back for the expand transition
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
  const st={time:0,cloud:[.2,.1],mouse:[.2,.1],target:[.2,.1],hover:0,hoverT:0,intro:0,scroll:0,face:0,faceT:0,slide:0,nut:0,band:[225,6,0],lock:false};
  const resize=()=>{const b=canvas.getBoundingClientRect();canvas.width=Math.max(1,Math.round(b.width*dpr));canvas.height=Math.max(1,Math.round(b.height*dpr));
    gl.viewport(0,0,canvas.width,canvas.height)};
  resize();new ResizeObserver(resize).observe(canvas);
  addEventListener('pointermove',e=>{const b=canvas.getBoundingClientRect();st.target=[clamp((e.clientX-b.left)/b.width*2-1,-1.4,1.4),clamp(-((e.clientY-b.top)/b.height*2-1),-1.4,1.4)];st.hoverT=1},{passive:true});
  document.addEventListener('pointerleave',()=>st.hoverT=0);
  let vis=true;new IntersectionObserver(([e])=>vis=e.isIntersecting).observe(canvas);
  const scrollP=()=>scrollLinked?clamp(scrollY/(canvas.offsetHeight||1)):0;
  const draw=()=>{gl.uniform1f(U('uTime'),st.time);gl.uniform2f(U('uRes'),canvas.width,canvas.height);gl.uniform2fv(U('uMouse'),st.mouse);gl.uniform2fv(U('uCloud'),st.cloud);
    gl.uniform1f(U('uHover'),st.hover);gl.uniform1f(U('uScroll'),st.scroll);gl.uniform1f(U('uPixel'),coarse?1:4*dpr);
    gl.uniform1f(U('uIntro'),st.intro);gl.uniform1f(U('uCenter'),centered?1:0);gl.uniform1f(U('uShape'),shape?1:0);gl.uniform1f(U('uBg'),bg);
    gl.uniform3f(U('uBgC'),...TH.bg.map(v=>v/255));gl.uniform3f(U('uFgC'),...TH.fg.map(v=>v/255));gl.uniform1f(U('uInv'),TH.inv);
    gl.uniform1f(U('uOut'),fadeOut?clamp((scrollY-innerHeight*.45)/(innerHeight*.5)):0);
    gl.uniform1f(U('uFace'),st.face);gl.uniform1f(U('uSlide'),st.slide);gl.uniform1f(U('uNut'),st.nut);gl.uniform3f(U('uBand'),...st.band.map(v=>v/255));
    gl.drawArrays(gl.TRIANGLES,0,3)};
  const pit=game?pitStop(canvas,st):null;
  if(reduced){st.intro=1;st.time=4;draw();addEventListener('scroll',()=>{st.scroll=scrollP();draw()},{passive:true});addEventListener('themechange',draw);return}
  const t0=performance.now();let last=0;
  (function frame(t){requestAnimationFrame(frame);if(!vis||(coarse&&t-last<32))return;last=t;
    st.time=(t-t0)/1000;
    const tg=st.lock?[0,0]:st.target;st.mouse=[st.mouse[0]+.09*(tg[0]-st.mouse[0]),st.mouse[1]+.09*(tg[1]-st.mouse[1])];
    st.face+=.12*(st.faceT-st.face);if(pit)pit(t);
    st.cloud=[st.cloud[0]+.15*(st.target[0]-st.cloud[0]),st.cloud[1]+.15*(st.target[1]-st.cloud[1])];
    st.hover+=.04*(st.hoverT-st.hover);st.intro+=.035*(1-st.intro);st.scroll=scrollP();draw()})(t0);
}
makeTyre($('#bg'),{shape:false,bg:.55,scrollLinked:false,fadeOut:true});   // site-wide lattice, dimmed so content reads
makeTyre($('#tyre2'),{centered:true,scrollLinked:false,bg:0,game:true}); // the tyre alone, over the shared lattice; click it for a pit stop

/* =====================================================================
   PORTRAIT — square pixels in 3D (data: face-data.js, one byte per cell)
   Every pixel sits on the line from the camera through its cell of the
   portrait, at its own depth, so at rest the field projects into one flat
   face. On load they fly in from outside the screen (~3 s); the pointer
   shifts the camera a little (the depth shows), scrolling flies it forward
   and the face comes apart.
   ===================================================================== */
let headAt=()=>null;   // set by the portrait: is this point on the head? (for the easter egg)
const FACE_VS=`
attribute vec2 aCell;attribute vec3 aStart;attribute vec3 aMisc;   // misc: brightness, depth, delay
uniform vec2 uRes,uC;uniform vec3 uCam;uniform float uCell,uTime,uDpr,uInv;
varying float vA;
void main(){
  float lum=mix(aMisc.x,1.-aMisc.x,uInv),d=aMisc.y,del=aMisc.z;   // light mode: dot size follows darkness
  float t=clamp((uTime-del)/1.6,0.,1.),e=1.-pow(1.-t,4.);           // each pixel: 1.6 s, quartic ease-out
  vec3 rest=vec3(aCell*uCell*d,d);                                   // world: screen px x depth (1 = picture plane)
  vec3 w=mix(aStart,rest,e);
  float z=w.z-uCam.z;
  vec2 s=uC+(w.xy-uCam.xy)/max(z,.001);
  gl_Position=vec4(s/uRes*2.-1.,0.,1.);gl_Position.y*=-1.;
  gl_PointSize=z>.02?max(1.,uCell*(.28+.62*lum)*w.z/z*uDpr):0.;
  vA=(.28+.72*lum)*smoothstep(.04,.3,z)*smoothstep(0.,.25,t);
}`;
const FACE_FS=`precision mediump float;varying float vA;uniform vec3 uFg;
void main(){gl_FragColor=vec4(uFg*vA,vA);}`;   // premultiplied text colour
(function face(){
  const cv=$('#face'),F=window.FACE;if(!cv||!F)return;
  const gl=cv.getContext('webgl',{antialias:false,alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true});if(!gl)return;
  const sh=(type,src)=>{const o=gl.createShader(type);gl.shaderSource(o,src);gl.compileShader(o);
    if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(o));return o};
  const prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,FACE_VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FACE_FS));
  gl.linkProgram(prog);gl.useProgram(prog);
  // cells → attributes; positions are relative to row FY (the eyes), which is what gets placed on screen
  const bytes=Uint8Array.from(atob(F.data),c=>c.charCodeAt(0)),FY=50;
  // head extent in cells: rows above the shoulders (first ~58% of the picture), widest filled columns there
  let hL=F.cols,hR=0,hT=F.rows;const hB=Math.round(F.rows*.58);
  for(let j=0;j<hB;j++)for(let i=0;i<F.cols;i++)if(bytes[j*F.cols+i]){hL=Math.min(hL,i);hR=Math.max(hR,i);hT=Math.min(hT,j)}
  headAt=(x,y)=>{if(scrollY>innerHeight*.25)return null;const b=cv.getBoundingClientRect(),cx=b.left+C[0],cy=b.top+C[1],
    l=cx+(hL-F.cols/2)*CELL,r=cx+(hR+1-F.cols/2)*CELL,t=cy+(hT-FY)*CELL,bt=cy+(hB-FY)*CELL;
    return x>=l&&x<=r&&y>=t&&y<=bt?{l,r,t,b:bt}:null};
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
    gl.uniform2f(U('uRes'),W,H);gl.uniform2fv(U('uC'),C);gl.uniform1f(U('uCell'),CELL);gl.uniform1f(U('uDpr'),dpr);gl.uniform1f(U('uTime'),time);gl.uniform1f(U('uInv'),TH.inv);gl.uniform3f(U('uFg'),...TH.fg.map(v=>v/255));
    gl.uniform3f(U('uCam'),(cx*2.2+Math.sin(time*.3)*.3)*CELL,(cy*1.6+Math.cos(time*.23)*.2)*CELL,sp*.7);   // pointer parallax + idle drift; scroll flies forward
    gl.drawArrays(gl.POINTS,0,N)};
  if(reduced){const d=()=>draw(99);d();addEventListener('scroll',d,{passive:true});addEventListener('themechange',d);new ResizeObserver(d).observe(cv);return}
  const t0=performance.now();
  (function frame(t){requestAnimationFrame(frame);if(!vis)return;
    cx+=.05*(tx-cx);cy+=.05*(ty-cy);draw((t-t0)/1000)})(t0);
})();

/* =====================================================================
   PROJECTS — pinned horizontal scroll, dithered procedural previews
   ===================================================================== */
const projects=[
  {k:'Research · 2026',t:'Fair Evaluation of LLMs',d:'Benchmarking how large language models perform across Indian languages, and what "fair" comparison means when data and scripts differ.',tags:['LLM evaluation','Multilingual','PyTorch'],art:'bars'},
  {k:'Research · 2026',t:'Graph-Based Hallucination Detection',d:'Turning model outputs into graphs of claims to flag unsupported statements; multilingual LoRA experiments on IIT Bombay\'s computing cluster.',tags:['Graphs','LoRA','High-performance computing'],art:'graph'},
  {k:'Project · Prof. Vishnu Narayanan',t:'BLADE — Neural Networks Trained by Integer Programming',d:'Training binarised neural networks with mixed-integer programming instead of gradient descent.',tags:['Mixed-integer programming','Optimization','Binarised networks'],art:'grid'},
  {k:'Model · 2026',t:'Bihar Prohibition, Simulated',d:'A system-dynamics model of Bihar\'s 2016 alcohol prohibition — stocks, flows and unintended feedback loops.',tags:['System dynamics','Policy','Simulation'],art:'flow'},
  {k:'Team · IITB Rocket Team',t:'Flight Telemetry System',d:'Avionics for a student rocket: sensor data from the flight computer, down a radio link, to a live ground display.',tags:['Embedded systems','Telemetry','C / C++'],art:'wave'},
];
const track=$('#pgrid');
projects.forEach((p,i)=>{const el=document.createElement('article');el.className='pcard';el.innerHTML=
 `<div class="meta"><span class="label"><b>${String(i+1).padStart(2,'0')}</b> / ${String(projects.length).padStart(2,'0')}</span><span class="label">${p.k}</span></div>
  <canvas data-art="${p.art}" data-cursor="View"></canvas>
  <div class="info"><h3>${p.t}</h3><div><p>${p.d}</p><div class="tags">${p.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div></div></div>`;track.append(el)});

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
const pcs={forEach:f=>document.querySelectorAll('canvas[data-art]').forEach(f)};   // live list: the expanded page adds more
function drawPreview(cv,t){
  const b=cv.getBoundingClientRect();if(b.bottom<0||b.top>innerHeight)return;
  const dpr=Math.min(devicePixelRatio||1,2),W=cv.width=b.width*dpr|0,H=cv.height=b.height*dpr|0;if(!W||!H)return;
  const cell=4*dpr,cols=W/cell|0,rows=H/cell|0;const d=art(cv.dataset.art,cols,rows,t);const g=cv.getContext('2d');
  g.fillStyle=rgba(TH.bg);g.fillRect(0,0,W,H);
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const v=d[(j*cols+i)*4]/255;const q=Math.floor(v*3+bay[(j&3)*4+(i&3)])/3;if(q<=0)continue;
    const s=cell*(.3+.6*q);g.fillStyle=rgba(TH.fg,.3+.7*q);g.fillRect(i*cell+(cell-s)/2,j*cell+(cell-s)/2,s,s)}
}
let pt=0;(function pl(t){if(t-pt>80){pcs.forEach(c=>drawPreview(c,t));pt=t}if(!reduced)requestAnimationFrame(pl)})(0);
addEventListener('themechange',()=>pcs.forEach(c=>drawPreview(c,performance.now())));

/* =====================================================================
   CONTACT — dotted sphere   |   FOOTER — ridgeline
   ===================================================================== */
(function sphere(){const cv=$('#dots'),g=cv.getContext('2d');let W,H;const rs=()=>{const b=cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);W=cv.width=b.width*d;H=cv.height=b.height*d};rs();addEventListener('resize',rs);
  const pts=[];for(let i=0;i<2200;i++){const y=1-2*(i+.5)/2200,r=Math.sqrt(1-y*y),a=i*2.399963;pts.push([Math.cos(a)*r,y,Math.sin(a)*r])}
  (function f(t){g.clearRect(0,0,W,H);const R=W*.42,c=Math.cos(t*.00015),s=Math.sin(t*.00015);
    for(const[x,y,z]of pts){const X=x*c-z*s,Z=x*s+z*c;if(Z<-.1)continue;const land=Math.sin(x*4.1+y*2)*Math.cos(z*3.3-y*1.4)>.15;const a=(land?.75:.18)*(.3+.7*Z);g.fillStyle=rgba(TH.fg,a);const sz=(land?2.6:1.6)*(W/700);g.fillRect(W/2+X*R,H/2-y*R,sz,sz)}
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
      g.fillStyle=rgba(TH.bg);g.fillRect(0,0,W,H);
      g.lineWidth=D;
      edges.forEach(e=>{const h=e.a.c>=0&&e.a.c===e.b.c?heat[e.a.c]:0;
        g.strokeStyle=e.trunk?rgba(TH.fg,.28):h>.05?`rgba(225,60,50,${(e.cross?.07:.13)+.45*h})`:rgba(TH.fg,(e.cross?.07:.13)+.45*h);
        g.beginPath();g.moveTo(e.a.x,e.a.y);g.lineTo(e.b.x,e.b.y);g.stroke()});
      // packets along the backbone and some spokes
      edges.forEach(e=>{if(!e.trunk&&e.ph>.35)return;const u=(ts*(e.trunk?.12:.25)+e.ph)%1;
        const x=e.a.x+(e.b.x-e.a.x)*u,y=e.a.y+(e.b.y-e.a.y)*u,s=(e.trunk?3:2)*D;
        g.fillStyle=e.trunk?rgba(TH.fg):rgba(TH.fg,.6);g.fillRect(snap(x)-s/2,snap(y)-s/2,s,s)});
      nodes.forEach(n=>{const h=n.c>=0?heat[n.c]:0;
        let s=n.hub?8:n.iso?3:Math.min(5,2+n.deg);s*=D;
        const tw=n.iso?.45+.3*Math.sin(ts*1.5+n.ph*3):1;
        if(n.hub){g.fillStyle=rgba(TH.bg);g.fillRect(snap(n.x)-s/2,snap(n.y)-s/2,s,s);g.strokeStyle=h>.05?'#e10600':rgba(TH.fg);g.strokeRect(snap(n.x)-s/2+.5,snap(n.y)-s/2+.5,s-1,s-1);
          g.fillStyle=h>.05?'#e10600':rgba(TH.fg);g.fillRect(snap(n.x)-D,snap(n.y)-D,2*D,2*D)}
        else{g.fillStyle=h>.05?`rgba(225,6,0,${.5+.5*h})`:rgba(TH.fg,n.iso?tw:.75);g.fillRect(snap(n.x)-s/2,snap(n.y)-s/2,s,s)}});
      g.font=`${10*D}px "Geist Mono",monospace`;
      if(hot>=0){const h=hubs[hot],m=members(hot).length;g.fillStyle=rgba(TH.fg,heat[hot]);
        g.fillText(`C${hot+1} · HUB DEG ${h.deg} · |V| ${m+1}`,h.x+10*D,h.y-10*D)}
      g.fillStyle=rgba(TH.fg,.45);
      g.fillText(`GRAPH · n=${nodes.length} · m=${edges.length} · k=${K} COMMUNITIES`,16*D,18*D);
    }
    if(!reduced)requestAnimationFrame(f)})(0);
})();

/* =====================================================================
   PIT STOP — the tyre behaves as before until you click it. Then the car
   is in the box: wait for green, loosen the nut, pull the wheel, fit the
   new one, tighten. Wrong clicks cost 0.5 s; jumping the light is a
   jump start. Best time stays in this browser.
   ===================================================================== */
function pitStop(canvas,st){
  const wrap=canvas.parentElement;
  const hud=document.createElement('div');hud.className='pit';
  hud.innerHTML='<div class="pit-lights"><i></i><i></i><i></i></div><div class="label pit-step">Click the tyre — pit stop</div><div class="pit-time"><span>0.00</span><small>s</small></div><div class="label pit-best"></div>';
  wrap.append(hud);
  const $s=hud.querySelector('.pit-step'),$t=hud.querySelector('.pit-time span'),$b=hud.querySelector('.pit-best'),lights=[...hud.querySelectorAll('.pit-lights i')];
  const COMP=[{n:'Soft',c:[225,6,0]},{n:'Medium',c:[245,196,0]},{n:'Hard',c:[236,234,226]}];
  const RECORD=1.80;   // fastest F1 stop on record (McLaren, Qatar 2023)
  let best=+(()=>{try{return localStorage.getItem('rb-pit')}catch(e){}})()||0,phase='idle',t0=0,pen=0,comp=0,anim=null,timer=0,pendingGo=0,done=0;
  const showBest=()=>{$b.textContent=best?`Best ${best.toFixed(2)} s · record ${RECORD.toFixed(2)} s`:`Record ${RECORD.toFixed(2)} s`};showBest();
  const say=(txt)=>{$s.textContent=txt};
  const setLights=n=>lights.forEach((l,i)=>{l.className=n==='go'?'go':i<n?'on':''});
  // where the wheel is on screen: centre of the canvas, shifted by the slide; radius ≈ .16 of the short side when face-on
  const hit=(e,slide)=>{const b=canvas.getBoundingClientRect(),m=Math.min(b.width,b.height),
    cx=b.left+b.width/2+slide*m,cy=b.top+b.height/2;return Math.hypot(e.clientX-cx,e.clientY-cy)/m};
  const tween=(from,to,dur,then)=>{anim={from,to,s:performance.now(),dur,then}};
  const reset=()=>{phase='idle';st.lock=false;st.faceT=0;st.slide=0;st.nut=0;hud.classList.remove('live','fin');setLights(0);say('Click the tyre — pit stop');canvas.dataset.cursor='Pit stop'};
  const start=()=>{clearTimeout(timer);clearTimeout(pendingGo);phase='lights';pen=0;st.lock=true;st.faceT=1;st.slide=0;st.nut=0;hud.classList.add('live');hud.classList.remove('fin');
    $t.textContent='0.00';say('Box, box — wait for green');canvas.dataset.cursor='';
    [0,1,2].forEach(i=>setTimeout(()=>{if(phase==='lights')setLights(i+1)},280+i*320));
    pendingGo=setTimeout(()=>{if(phase!=='lights')return;phase='loosen';setLights('go');t0=performance.now();st.nut=1;say('Gun on the nut — loosen')},1240+Math.random()*900)};
  const miss=(e)=>{pen+=.5;const f=document.createElement('span');f.className='pit-pen';f.textContent='+0.5';f.style.left=(e.clientX-wrap.getBoundingClientRect().left)+'px';f.style.top=(e.clientY-wrap.getBoundingClientRect().top)+'px';wrap.append(f);setTimeout(()=>f.remove(),900)};
  canvas.addEventListener('click',e=>{
    if(anim)return;
    if(phase==='idle'||phase==='done'){if(hit(e,0)<.22)start();return}
    if(phase==='lights'){clearTimeout(pendingGo);phase='jump';setLights(0);say('Jump start. Not like this.');menace(e.clientX,e.clientY);timer=setTimeout(reset,1600);return}
    if(phase==='loosen'){if(hit(e,0)<.07){st.nut=0;phase='off';say('Pull the wheel')}else miss(e);return}
    if(phase==='off'){if(hit(e,0)<.22){tween(0,1.3,220,()=>{comp=(comp+1)%3;st.band=COMP[comp].c;st.slide=-.4;phase='on';say(`Fit the ${COMP[comp].n.toLowerCase()}s`)})}else miss(e);return}
    if(phase==='on'){if(hit(e,-.4)<.22){tween(-.4,0,220,()=>{phase='tighten';st.nut=1;say('Tighten')})}else miss(e);return}
    if(phase==='tighten'){if(hit(e,0)<.07){st.nut=0;phase='done';const time=(performance.now()-t0)/1000+pen;$t.textContent=time.toFixed(2);
      const pb=!best||time<best;if(pb){best=time;try{localStorage.setItem('rb-pit',best.toFixed(3))}catch(e){}}showBest();hud.classList.add('fin');
      say(time<RECORD?'Faster than the world record. Suspicious.':pb?`Personal best${pen?` (${pen.toFixed(1)} s in penalties)`:''} — click to go again`:`${pen?`${pen.toFixed(1)} s in penalties — `:''}click to go again`);
      canvas.dataset.cursor='Again';timer=setTimeout(reset,7000)}else miss(e)}
  });
  addEventListener('keydown',e=>{if(e.key==='Escape'&&phase!=='idle'){clearTimeout(timer);clearTimeout(pendingGo);reset()}});
  // per-frame: slide animation and the running clock
  return t=>{
    if(anim){const k=clamp((t-anim.s)/anim.dur),e=k*k*(3-2*k);st.slide=anim.from+(anim.to-anim.from)*e;if(k>=1){const f=anim.then;anim=null;f()}}
    if(phase==='loosen'||phase==='off'||phase==='on'||phase==='tighten')$t.textContent=((t-t0)/1000+pen).toFixed(2);
  };
}

/* =====================================================================
   DIVERGENCE METER — eight pixel Nixie tubes. Cycles through numbers
   about me; each change scrambles the tubes before they settle, like a
   worldline shift. Hover reads the caption, click jumps to the next.
   The meter is an object, so it keeps its own dark glass in both modes.
   ===================================================================== */
// TODO(Ruchir): the entries marked "placeholder" need your real numbers
const WORLDLINES=[
  {v:'1.048596',c:'1.048596 — the Steins;Gate worldline. You are on the right one.'},
  {v:'3',c:'Courses I have been a teaching assistant for: Probability, Calculus, Optimization.'},
  {v:'107.421',c:'Best lap in Assetto Corsa, seconds (placeholder — put your real lap and track here).'},
  {v:'142',c:'Current Wordle streak (placeholder).'},
  {v:'0.337187',c:'0.337187 — the Alpha worldline. Something went wrong here.'},
  {v:'2',c:'Department rank in IEOR, IIT Bombay.'},
  {v:'1.130205',c:'1.130205 — a Beta worldline. Click again to escape it.'},
];
(function nixie(){
  const cv=$('#nixie');if(!cv)return;const g=cv.getContext('2d'),cap=$('#dmCap'),wrap=cv.closest('.dm');
  const TUBES=8,GW=9,GH=15;   // glyph grid per tube, in pixels-of-the-display
  let W=0,H=0,dpr=1,tw=0,cell=0;
  // rasterise each glyph once into a GW×GH on/off grid
  const glyph={};const gc=document.createElement('canvas');gc.width=GW*4;gc.height=GH*4;const gg=gc.getContext('2d',{willReadFrequently:true});
  const raster=ch=>{gg.clearRect(0,0,gc.width,gc.height);gg.fillStyle='#fff';gg.textAlign='center';gg.textBaseline='middle';
    gg.font=`300 ${GH*4*1.02}px "Big Shoulders Display"`;gg.fillText(ch,gc.width/2,gc.height*.54);
    const d=gg.getImageData(0,0,gc.width,gc.height).data,out=new Uint8Array(GW*GH);
    for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){let s=0;for(let j=0;j<4;j++)for(let i=0;i<4;i++)s+=d[((y*4+j)*gc.width+x*4+i)*4+3];out[y*GW+x]=s>16*255*.32?1:0}return out};
  const build=()=>{for(const ch of '0123456789')glyph[ch]=raster(ch);
    const dot=new Uint8Array(GW*GH);dot[(GH-2)*GW+4]=dot[(GH-2)*GW+5]=dot[(GH-3)*GW+4]=dot[(GH-3)*GW+5]=1;glyph['.']=dot;
    const stack=new Uint8Array(GW*GH);for(const ch of '0123456789')glyph[ch].forEach((v,i)=>{if(v)stack[i]=1});glyph.stack=stack};   // the unlit cathodes behind
  const resize=()=>{const b=cv.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);W=cv.width=b.width*dpr|0;H=cv.height=b.height*dpr|0;tw=W/TUBES;cell=Math.min(tw*.78/GW,H*.74/GH)};
  let idx=0,shown=Array(TUBES).fill(' '),target=Array(TUBES).fill(' '),settle=Array(TUBES).fill(0),hover=false,next=0;
  const pad=v=>{const a=v.slice(-TUBES).split('');while(a.length<TUBES)a.unshift(' ');return a};
  const go=(i,now)=>{idx=(i+WORLDLINES.length)%WORLDLINES.length;target=pad(WORLDLINES[idx].v);
    settle=target.map((_,k)=>now+(reduced?0:380+k*110+Math.random()*260));if(hover)cap.textContent=WORLDLINES[idx].c;next=now+6500};
  const draw=now=>{
    g.clearRect(0,0,W,H);
    for(let k=0;k<TUBES;k++){
      const x0=k*tw,ch=now<settle[k]?(Math.random()<.85?String(Math.random()*10|0):' '):target[k];shown[k]=ch;
      // glass
      const gx=x0+tw*.08,gy=H*.04,gw2=tw*.84,gh=H*.92,r=gw2*.42;
      const grd=g.createLinearGradient(gx,gy,gx+gw2,gy);grd.addColorStop(0,'#1a100a');grd.addColorStop(.5,'#0c0705');grd.addColorStop(1,'#1a100a');
      g.fillStyle=grd;g.beginPath();g.roundRect(gx,gy,gw2,gh,[r,r,6*dpr,6*dpr]);g.fill();
      g.strokeStyle='rgba(255,150,80,.16)';g.lineWidth=dpr;g.stroke();
      g.fillStyle='rgba(255,255,255,.05)';g.fillRect(gx+gw2*.18,gy+gh*.12,gw2*.06,gh*.6);   // glass highlight
      // cathodes: unlit stack faintly, lit glyph glowing
      const ox=x0+(tw-GW*cell)/2,oy=(H-GH*cell)/2+H*.02,sz=cell*.8;
      g.shadowBlur=0;g.fillStyle='rgba(255,120,40,.07)';glyph.stack.forEach((v,i)=>{if(v)g.fillRect(ox+(i%GW)*cell,oy+(i/GW|0)*cell,sz,sz)});
      const gl=glyph[ch];if(!gl)continue;
      const flick=now<settle[k]?.75:.92+Math.random()*.08;
      g.shadowColor='rgba(255,90,10,.9)';g.shadowBlur=cell*1.6;g.fillStyle=`rgba(255,${150+(hover?20:0)},70,${flick})`;
      gl.forEach((v,i)=>{if(v)g.fillRect(ox+(i%GW)*cell,oy+(i/GW|0)*cell,sz,sz)});g.shadowBlur=0;
    }
  };
  wrap.addEventListener('pointerenter',()=>{hover=true;cap.textContent=WORLDLINES[idx].c;wrap.classList.add('on')});
  wrap.addEventListener('pointerleave',()=>{hover=false;cap.textContent=cap.dataset.hint;wrap.classList.remove('on')});
  cv.addEventListener('click',()=>go(idx+1,performance.now()));
  let vis=false;new IntersectionObserver(([e])=>vis=e.isIntersecting).observe(cv);
  (async()=>{try{await document.fonts.load('300 60px "Big Shoulders Display"')}catch(e){}build();resize();new ResizeObserver(resize).observe(cv);
    go(0,performance.now());let last=0;
    (function f(now){requestAnimationFrame(f);if(!vis||now-last<45)return;last=now;if(!hover&&now>next)go(idx+1,now);draw(now)})(0)})();
})();

/* =====================================================================
   EASTER EGGS
   ゴゴゴ — menacing glyphs whenever you do something you shouldn't:
   hammering on things that aren't buttons, jump-starting the pit stop,
   right-clicking the portrait, trying to drag the name around.
   ===================================================================== */
function menace(x,y,fx=0){
  if(reduced)return;
  if(!document.getElementById('gogoGrad'))document.body.insertAdjacentHTML('beforeend','<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="gogoGrad" x1="0" y1="0" x2="1" y2="1"><stop offset=".08" stop-color="#3a1149"/><stop offset=".45" stop-color="#7a2a8f"/><stop offset=".92" stop-color="#c64d93"/></linearGradient></defs></svg>');
  // a trail like the manga panels: big ゴ first, each next one smaller, stepping down and zig-zagging sideways
  const dx=fx||(x>innerWidth*.75?-1:1),dy=y>innerHeight*.65?-1:1;let fs=56,px=x,py=y;
  for(let i=0;i<6;i++){const s=document.createElement('span');s.className='gogo';s.innerHTML='<svg viewBox="0 0 100 100"><text x="50" y="84" text-anchor="middle">ゴ</text></svg>';s.setAttribute('aria-hidden','true');
    s.style.left=px+'px';s.style.top=py+'px';s.style.setProperty('--fs',fs.toFixed(0)+'px');s.style.setProperty('--r',(-8+Math.random()*10).toFixed(0)+'deg');
    s.style.animationDelay=(i*.09).toFixed(2)+'s';document.body.append(s);setTimeout(()=>s.remove(),2300);
    px+=dx*fs*(i%2?-.35:.55);py+=dy*fs*.82;fs*=.8}
}
(()=>{
  // three quick clicks on something that isn't interactive
  let n=0,t=0;const live='a,button,input,textarea,select,label,canvas,.xp-row,.layer,.dm,[data-expand]';
  document.addEventListener('click',e=>{if(e.target.closest(live)){n=0;return}const now=performance.now();n=now-t<450?n+1:1;t=now;if(n>=3){n=0;menace(e.clientX,e.clientY)}});
  // right-click or triple-click on the face: no context menu, glyphs rise on both sides of the head instead
  const besideHead=e=>{const h=headAt(e.clientX,e.clientY);if(!h)return false;const y=h.t+(h.b-h.t)*.22;
    menace(h.l-60,y,-1);setTimeout(()=>menace(h.r+60,y,1),120);return true};
  $('#face')?.addEventListener('contextmenu',e=>{if(besideHead(e))e.preventDefault()});
  $('#face')?.addEventListener('click',e=>{if(e.detail===3)besideHead(e)});
  document.querySelector('.giant')?.addEventListener('dragstart',e=>{e.preventDefault();menace(e.clientX,e.clientY)});
  document.querySelector('.giant')?.addEventListener('dblclick',e=>menace(e.clientX,e.clientY));
})();

/* =====================================================================
   EXPAND — a section opens into its own page, and the page's pixels make
   the trip. On Expand: everything visible is copied into dots (text is
   redrawn word by word in its own font, colour and place; canvases are
   copied as they are), the expanded page is laid out invisibly and copied
   the same way, then every dot flies from somewhere on the old screen to
   somewhere on the new one. Real text fades in where the dots landed.
   Back (button, Esc, browser back) runs it the other way.
   ===================================================================== */
const layer=$('#layer'),layerBody=$('#layerBody'),mainEl=$('main');
const noFade=h=>h.replace(/\b(fade|reveal)\b( in)?/g,'').replace(/ id="[^"]*"/g,'');
const PAGES={
  about:()=>`<div class="pg">
    <div class="label">[ <b>01</b> ] · About, in full</div>
    <h1 class="pg-title">From theory<br><span class="ol">to decisions</span></h1>
    <div class="pg-cols"><div class="pg-copy">${noFade($('#about .body-copy').innerHTML)}
      <p class="todo">Long-form bio — to be written.</p></div>
      <aside class="profile">${noFade($('#about .profile dl').outerHTML)}</aside></div>
    <div class="label pg-sub">Education &amp; roles</div>${noFade($('#experience .edu .cards').outerHTML)}</div>`,
  experience:()=>`<div class="pg">
    <div class="label">[ <b>02</b> ] · Experience, in full</div>
    <h1 class="pg-title">Where I've<br><span class="ol">worked</span></h1>
    ${[...document.querySelectorAll('#experience .xp-row')].map(r=>`<article class="pg-role">
      <canvas class="dotnum" data-n="${r.querySelector('.xp-i').textContent}"${r.querySelector('.chip.live')?' data-red':''}></canvas>
      <div><div class="pg-when">${r.querySelector('.chip').outerHTML}<span class="label">${r.querySelector('.xp-when .label')?.textContent||''}</span></div>
        <h2>${r.querySelector('h3').textContent}</h2><div class="xp-org">${r.querySelector('.xp-org').textContent}</div>
        <div class="pg-more">${r.querySelector('.xp-more').innerHTML}</div>
        <ul class="todo"><li>What I worked on — to be written</li><li>What came out of it — to be written</li></ul></div></article>`).join('')}</div>`,
  projects:()=>`<div class="pg">
    <div class="label">[ <b>03</b> ] · Projects, in full</div>
    <h1 class="pg-title">Selected<br><span class="ol">projects</span></h1>
    ${projects.map((p,i)=>`<article class="pg-proj"><canvas data-art="${p.art}"></canvas>
      <div><div class="label"><b>${String(i+1).padStart(2,'0')}</b> / ${String(projects.length).padStart(2,'0')} · ${p.k}</div><h2>${p.t}</h2><p>${p.d}</p>
        <p class="todo">Full write-up — problem, approach, results — to be written.</p>
        <div class="tags">${p.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        <div class="pg-links"><a class="btn" href="#">Code ↗</a><a class="btn" href="#">Report ↗</a></div></div></article>`).join('')}</div>`,
};
const TITLES={about:'01 · About',experience:'02 · Experience',projects:'03 · Projects'};

// big numerals made of square dots, for the expanded experience page
function drawDotNum(cv){
  const b=cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2),W=cv.width=b.width*d|0,H=cv.height=b.height*d|0;if(!W||!H)return;
  const cell=Math.max(4,Math.round(H/34)),cols=W/cell|0,rows=H/cell|0,o=document.createElement('canvas');o.width=cols;o.height=rows;
  const og=o.getContext('2d',{willReadFrequently:true});og.fillStyle='#fff';og.font=`600 ${rows*1.05}px "Big Shoulders Display"`;og.textBaseline='middle';og.fillText(cv.dataset.n,0,rows*.54);
  const px=og.getImageData(0,0,cols,rows).data,g=cv.getContext('2d');g.clearRect(0,0,W,H);g.fillStyle=cv.hasAttribute('data-red')?'#e10600':rgba(TH.fg);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(px[(y*cols+x)*4+3]>110)g.fillRect(x*cell,y*cell,cell*.8,cell*.8);
}
addEventListener('themechange',()=>layer.querySelectorAll('.dotnum').forEach(drawDotNum));

/* ---- copy what's on screen into dots ---- */
function visibleIn(el,root){for(let e=el;e&&e!==root;e=e.parentElement){const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<.05)return false}return true}
function snapshot(rootEl){
  const W=innerWidth,H=innerHeight,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d',{willReadFrequently:true});
  const tw=document.createTreeWalker(rootEl,NodeFilter.SHOW_TEXT),rg=document.createRange(),seen=new Map();let n;
  while((n=tw.nextNode())){
    const txt=n.nodeValue;if(!txt.trim())continue;const el=n.parentElement,r0=el.getBoundingClientRect();
    if(r0.bottom<0||r0.top>H||r0.right<0||r0.left>W||!r0.width)continue;
    let ok=seen.get(el);if(ok===undefined){ok=visibleIn(el,rootEl);seen.set(el,ok)}if(!ok)continue;
    const cs=getComputedStyle(el);g.font=`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    try{g.letterSpacing=cs.letterSpacing==='normal'?'0px':cs.letterSpacing}catch(e){}
    const up=cs.textTransform==='uppercase',sw=parseFloat(cs.webkitTextStrokeWidth)||0,clear=cs.color.replace(/\s/g,'').match(/,0\)$|transparent/);
    const re=/\S+/g;let m;
    while((m=re.exec(txt))){
      rg.setStart(n,m.index);rg.setEnd(n,m.index+m[0].length);const r=rg.getClientRects()[0];if(!r||r.bottom<0||r.top>H)continue;
      const w=up?m[0].toUpperCase():m[0],mt=g.measureText(w),asc=mt.fontBoundingBoxAscent||mt.actualBoundingBoxAscent,desc=mt.fontBoundingBoxDescent||0;
      const y=r.top+(r.height-asc-desc)/2+asc;
      if(sw&&clear){g.strokeStyle=cs.webkitTextStrokeColor||cs.color;g.lineWidth=Math.max(1,sw);g.strokeText(w,r.left,y)}
      else{g.fillStyle=cs.color;g.fillText(w,r.left,y)}
    }
  }
  rootEl.querySelectorAll('canvas').forEach(cv=>{const r=cv.getBoundingClientRect();if(r.bottom<0||r.top>H||!r.width||!visibleIn(cv,rootEl))return;try{g.drawImage(cv,r.left,r.top,r.width,r.height)}catch(e){}});
  const d=g.getImageData(0,0,W,H).data;let step=3;const pts=[];
  for(let y=0;y<H;y+=step)for(let x=(y/step&1)?1:0;x<W;x+=step){const k=(y*W+x)*4;if(d[k+3]>70)pts.push(x,y,d[k],d[k+1],d[k+2],d[k+3])}
  return pts;   // flat: x, y, r, g, b, a
}

/* ---- the flight ---- */
const fx=document.createElement('canvas');fx.id='fx';fx.setAttribute('aria-hidden','true');document.body.append(fx);
const fgl=fx.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false});
let fprog=null;
if(fgl){
  const VS=`attribute vec2 aF,aT;attribute vec4 aCF,aCT;attribute vec3 aR;uniform float uT,uDot,uOff;uniform vec2 uRes;varying vec4 vC;
  void main(){float e=clamp(uT*1.5-aR.z*.5,0.,1.);e=e<.5?4.*e*e*e:1.-pow(-2.*e+2.,3.)/2.;float b=sin(3.1416*e);
    vec2 p=mix(aF,aT+vec2(0.,uOff),e)+aR.xy*b*min(uRes.x,uRes.y)*.28;
    gl_Position=vec4(p/uRes*2.-1.,0.,1.);gl_Position.y*=-1.;gl_PointSize=uDot*(1.+b*1.4);
    vec4 c=mix(aCF,aCT,e);vC=vec4(c.rgb*c.a,c.a);}`;
  const FS=`precision mediump float;varying vec4 vC;void main(){gl_FragColor=vC;}`;
  const sh=(t,s)=>{const o=fgl.createShader(t);fgl.shaderSource(o,s);fgl.compileShader(o);if(!fgl.getShaderParameter(o,fgl.COMPILE_STATUS))console.error(fgl.getShaderInfoLog(o));return o};
  fprog=fgl.createProgram();fgl.attachShader(fprog,sh(fgl.VERTEX_SHADER,VS));fgl.attachShader(fprog,sh(fgl.FRAGMENT_SHADER,FS));fgl.linkProgram(fprog);
}
function fly(A,B,done,off=()=>0){
  if(!fprog||reduced){done();return}
  const dpr=Math.min(devicePixelRatio||1,2);fx.width=innerWidth*dpr;fx.height=innerHeight*dpr;fgl.viewport(0,0,fx.width,fx.height);
  const nA=A.length/6,nB=B.length/6;if(!nA||!nB){done();return}
  const N=Math.min(60000,Math.max(nA,nB)),pos=new Float32Array(N*4),col=new Uint8Array(N*8),rnd=new Float32Array(N*3);
  const order=Uint32Array.from({length:N},(_,i)=>i);for(let i=N-1;i>0;i--){const j=Math.random()*(i+1)|0;[order[i],order[j]]=[order[j],order[i]]}   // each dot lands somewhere unrelated: pixels go everywhere
  for(let i=0;i<N;i++){const a=(i<nA?i:Math.random()*nA|0)*6,b=(order[i]%nB)*6;
    pos.set([A[a],A[a+1],B[b],B[b+1]],i*4);col.set([A[a+2],A[a+3],A[a+4],A[a+5],B[b+2],B[b+3],B[b+4],B[b+5]],i*8);
    const ang=Math.random()*6.283,m=Math.random();rnd.set([Math.cos(ang)*m,Math.sin(ang)*m,Math.random()],i*3)}
  fgl.useProgram(fprog);
  const bind=(name,data,size,type,norm,stride,off,buf)=>{const l=fgl.getAttribLocation(fprog,name);fgl.bindBuffer(fgl.ARRAY_BUFFER,buf);fgl.enableVertexAttribArray(l);fgl.vertexAttribPointer(l,size,type,norm,stride,off)};
  const mk=d=>{const b=fgl.createBuffer();fgl.bindBuffer(fgl.ARRAY_BUFFER,b);fgl.bufferData(fgl.ARRAY_BUFFER,d,fgl.STATIC_DRAW);return b};
  const bp=mk(pos),bc=mk(col),br=mk(rnd);
  bind('aF',0,2,fgl.FLOAT,false,16,0,bp);bind('aT',0,2,fgl.FLOAT,false,16,8,bp);
  bind('aCF',0,4,fgl.UNSIGNED_BYTE,true,8,0,bc);bind('aCT',0,4,fgl.UNSIGNED_BYTE,true,8,4,bc);bind('aR',0,3,fgl.FLOAT,false,12,0,br);
  fgl.enable(fgl.BLEND);fgl.blendFunc(fgl.ONE,fgl.ONE_MINUS_SRC_ALPHA);
  fgl.uniform2f(fgl.getUniformLocation(fprog,'uRes'),innerWidth,innerHeight);fgl.uniform1f(fgl.getUniformLocation(fprog,'uDot'),2.6*dpr);
  const uT=fgl.getUniformLocation(fprog,'uT'),uO=fgl.getUniformLocation(fprog,'uOff'),dur=1250,t0=performance.now();fx.classList.add('on');
  (function f(t){const k=clamp((t-t0)/dur);fgl.clearColor(0,0,0,0);fgl.clear(fgl.COLOR_BUFFER_BIT);fgl.uniform1f(uT,k);fgl.uniform1f(uO,off());fgl.drawArrays(fgl.POINTS,0,N);
    if(k<1)requestAnimationFrame(f);else{done();setTimeout(()=>{fx.classList.remove('on');[bp,bc,br].forEach(b=>fgl.deleteBuffer(b))},260)}})(t0);
}

/* ---- open / close ---- */
let openName=null,busy=false;
const settle=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
async function expand(name){
  if(busy||openName||!PAGES[name])return;busy=true;
  layerBody.innerHTML=PAGES[name]();$('#layerTitle').textContent=TITLES[name];layer.scrollTop=0;
  layer.classList.add('measure');layer.setAttribute('aria-hidden','false');
  try{await document.fonts.ready}catch(e){}await settle();
  layer.querySelectorAll('.dotnum').forEach(drawDotNum);layer.querySelectorAll('canvas[data-art]').forEach(c=>drawPreview(c,performance.now()));
  const A=snapshot(mainEl),B=snapshot(layer);
  mainEl.classList.add('gone');lockScroll(true);openName=name;const s0=layer.scrollTop;   // the (still invisible) page can already be scrolled; the dots follow it
  fly(A,B,()=>{layer.classList.remove('measure');layer.classList.add('open');busy=false;$('#back').focus({preventScroll:true})},()=>s0-layer.scrollTop);
  if(location.hash!=='#'+name+'-full')history.pushState({full:name},'','#'+name+'-full');
}
function collapse(){
  if(busy||!openName)return;busy=true;
  const A=snapshot(layer);layer.classList.remove('open');layer.classList.add('instant');
  const B=snapshot(mainEl);   // main is invisible but laid out, so it can still be copied
  lockScroll(false);const y0=scrollY;   // scrolling is live again straight away; the dots land wherever the page has scrolled to
  fly(A,B,()=>{mainEl.classList.remove('gone');layer.classList.remove('instant');layer.setAttribute('aria-hidden','true');layerBody.innerHTML='';openName=null;busy=false},()=>y0-scrollY);
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-expand]');if(b){e.preventDefault();expand(b.dataset.expand)}});
$('#back').addEventListener('click',()=>history.state&&history.state.full?history.back():collapse());
addEventListener('keydown',e=>{if(e.key==='Escape'&&openName)$('#back').click()});
addEventListener('popstate',()=>{if(openName&&!(history.state&&history.state.full))collapse()});
// a page loaded straight onto an expanded view (e.g. a shared #projects-full link) opens it
{const m=location.hash.match(/^#(about|experience|projects)-full$/);if(m){history.replaceState(null,'',location.pathname);setTimeout(()=>expand(m[1]),600)}}

/* form — no backend yet */
$('#f3').addEventListener('input',e=>$('#cc').textContent=e.target.value.length);
$('#form').addEventListener('submit',e=>{e.preventDefault();$('#note').textContent='Form not connected yet — email me directly.'});
})();

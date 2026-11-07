const $=s=>document.querySelector(s),RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
// ============================================================
// CONFIGURAÇÃO DO CORPO 3D — edite aqui
// ============================================================
// Modelo anatômico (GLB). Se o arquivo não existir, o site usa o corpo procedural.
//  height = altura final do corpo em unidades 3D (pés em y=0, topo da cabeça em y=height)
//  rotY   = giro em graus se o modelo não estiver de frente (0, 90, 180 ou 270)
//  offset = ajuste fino [x, y, z], aplicado depois de centralizar
const MODEL = { url: 'assets/corpo.glb', height: 1.8, rotY: 0, offset: [0, 0, 0] };

// Aparência de holograma (cor, brilho do corpo, brilho das bordas)
const HOLO_CFG = { color: 0x20e0ff, base: 0.12, rim: 0.5 };

// Posições [x, y, z] das glândulas no sistema do corpo normalizado:
//  x = lateral (centro = 0; glândulas pares usam x positivo e são espelhadas)
//  y = altura (0 = sola do pé, 1.8 = topo da cabeça)
//  z = profundidade (positivo = frente do corpo)
// Valores iniciais aproximados para um adulto com altura 1.8; ajuste com ?calibrar na URL.
const GLAND_POSITIONS = {
  hip: [0, 1.668, 0.012],   // Hipotálamo: base do cérebro, logo acima da hipófise
  hpf: [0, 1.645, 0.014],   // Hipófise: base do cérebro, na sela turca
  pin: [0, 1.690, -0.042],  // Pineal: acima e atrás da hipófise
  tir: [0, 1.500, 0.040],   // Tireoide: pescoço, abaixo da laringe
  par: [0.018, 1.505, 0.026], // Paratireoides: atrás da tireoide (par)
  tim: [0, 1.400, 0.058],   // Timo: atrás do esterno
  adr: [0.050, 1.240, -0.052], // Adrenais: sobre os rins (par)
  pan: [0, 1.170, -0.010],  // Pâncreas: atrás do estômago
  ova: [0.055, 0.970, 0.005], // Ovários: pelve (par)
  tes: [0.030, 0.800, 0.040]  // Testículos: bolsa escrotal (par)
};
// Raio (em unidades 3D) de cada glândula
const GLAND_SIZE = { hip: .014, hpf: .013, pin: .011, tir: .02, par: .008, tim: .035, adr: .026, pan: .028, ova: .02, tes: .02 };
// Distância da câmera ao "voar" até cada glândula (menor = mais perto)
const GLAND_FLY = { hip: .45, hpf: .45, pin: .45, tir: .6, par: .5, tim: .8, adr: .9, pan: .9, ova: .9, tes: .9 };
// Lado do rótulo (l = esquerda, r = direita) e nome curto mostrado no rótulo
const LABEL_SIDE = { hip: 'r', hpf: 'l', pin: 'l', tir: 'r', par: 'l', tim: 'r', adr: 'l', pan: 'r', ova: 'r', tes: 'r' };
const LABEL_SHORT = { hip: 'Hipotál.', hpf: 'Hipófise', pin: 'Pineal', tir: 'Tireoide', par: 'Paratir.', tim: 'Timo', adr: 'Adrenais', pan: 'Pâncreas', ova: 'Ovários', tes: 'Testíc.' };
// ============================================================

const G=[
{id:'hip',n:'Hipotálamo',c:0xff3df0,h:'Hormônios liberadores (TRH, CRH, GnRH, GHRH); produz ADH e ocitocina',f:'Liga o sistema nervoso ao endócrino e comanda a hipófise.',d:'Diabetes insipidus (falta de ADH)'},
{id:'hpf',n:'Hipófise',c:0xffb020,h:'GH, TSH, ACTH, FSH, LH, prolactina; libera ADH e ocitocina',f:'"Centro de comando": estimula tireoide, adrenais e gônadas e regula o crescimento.',d:'Acromegalia, nanismo hipofisário'},
{id:'pin',n:'Pineal',c:0x7aa2ff,h:'Melatonina',f:'Regula o ritmo circadiano (sono e vigília).',d:'Alterações do ritmo do sono'},
{id:'tir',n:'Tireoide',c:0x20e0ff,sx:1.6,h:'T3, T4, calcitonina',f:'Controla o metabolismo; a calcitonina reduz o cálcio no sangue.',d:'Hipotireoidismo, hipertireoidismo'},
{id:'par',n:'Paratireoides',m:1,c:0x7dffb0,h:'PTH',f:'Eleva o cálcio no sangue.',d:'Hipo e hiperparatireoidismo'},
{id:'tim',n:'Timo',c:0x9dff7a,h:'Hormônios tímicos',f:'Maturação dos linfócitos T, mais ativo na infância.',d:'Diminui com a idade (involução)'},
{id:'adr',n:'Adrenais (suprarrenais)',m:1,c:0xff6a3d,h:'Cortisol, aldosterona, adrenalina, noradrenalina',f:'Resposta ao estresse ("luta ou fuga"), sal e água, glicose.',d:'Síndrome de Cushing, doença de Addison'},
{id:'pan',n:'Pâncreas endócrino',c:0xffe14a,sx:2.6,h:'Insulina, glucagon, somatostatina',f:'Regula a glicemia: insulina baixa, glucagon eleva.',d:'Diabetes tipo 1 e tipo 2'},
{id:'ova',n:'Ovários',m:1,sex:'f',c:0xff7ac8,h:'Estrogênio, progesterona',f:'Puberdade feminina e ciclo menstrual.',d:'Síndrome dos ovários policísticos (SOP)'},
{id:'tes',n:'Testículos',m:1,sex:'m',c:0x5aa0ff,h:'Testosterona',f:'Características masculinas e produção de espermatozoides.',d:'Hipogonadismo'}];
G.forEach(g=>{g.p=GLAND_POSITIONS[g.id].slice();g.s=GLAND_SIZE[g.id]});
const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
// texto acessível + tabela
$('#gl').innerHTML=G.map(g=>`<li><b>${g.n}</b>: ${g.h}. ${g.f} Doenças: ${g.d}.</li>`).join('');
const tb=$('#tb');tb.innerHTML=G.map(g=>`<tr><td>${g.n}</td><td>${g.h}</td><td>${g.f}</td><td>${g.d}</td></tr>`).join('');
$('#q').oninput=e=>{const v=e.target.value.toLowerCase();[...tb.rows].forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(v))};
function info(g){$('#panel').innerHTML=`<h3>${g.n}</h3><p><b>Hormônios:</b> ${g.h}</p><p><b>Função:</b> ${g.f}</p><p><b>Doenças:</b> ${g.d}</p>`}
// título letra por letra
const t=$('#t');t.innerHTML=[...t.textContent].map((c,i)=>`<span style="animation-delay:${.6+i*.04}s">${c==' '?'&nbsp;':c}</span>`).join('');
t.setAttribute('aria-label',t.textContent);
// tema, cursor, progresso, reveal, menu
$('#th').onclick=()=>{const d=document.documentElement;d.dataset.theme=d.dataset.theme=='dark'?'light':'dark'};
const cur=$('.cur');addEventListener('pointermove',e=>{cur.style.transform=`translate(${e.clientX-7}px,${e.clientY-7}px)`;cur.classList.toggle('big',!!e.target.closest('button,a,canvas'))});
const hc=$('#hc');
addEventListener('scroll',()=>{const f=scrollY/(document.body.scrollHeight-innerHeight);$('#lvl i').style.transform=`scaleY(${f})`;const h=Math.min(1,scrollY/innerHeight);hc.style.opacity=1-h;hc.style.transform=`scale(${1+h*.6})`},{passive:true});
const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('in')),{threshold:.12});document.querySelectorAll('.rv').forEach(s=>io.observe(s));
const links=[...document.querySelectorAll('nav a')];
new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&links.forEach(a=>a.classList.toggle('act',a.hash=='#'+e.target.id))),{threshold:.4}).observe&&document.querySelectorAll('main section[id]').forEach(s=>new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&links.forEach(a=>a.classList.toggle('act',a.hash=='#'+s.id))),{threshold:.35}).observe(s));
// partículas da abertura: silhueta do corpo
(()=>{const c=hc,x=c.getContext('2d');let W,H,P=[],m={x:-999,y:-999};
const inB=(u,v)=>{const dx=Math.abs(u);return(dx*dx+(v-.1)**2<.012)||(dx<.03&&v>.17&&v<.25)||(dx<.15&&v>.23&&v<.62)||(dx>.14&&dx<.2&&v>.25&&v<.7)||(dx<.14&&dx>.015&&v>.62&&v<1.05)};
function rs(){W=c.width=innerWidth;H=c.height=innerHeight;const S=H*.8,n=W<700?700:1300;P=[];while(P.length<n){const u=Math.random()-.5,v=Math.random()*1.05-.05;if(inB(u,v))P.push({hx:W/2+u*S,hy:H*.1+v*S,x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.6+.6,k:Math.random()})}}
rs();addEventListener('resize',rs);addEventListener('pointermove',e=>{m.x=e.clientX;m.y=e.clientY});
(function f(t){if(scrollY<innerHeight*1.2){x.clearRect(0,0,W,H);P.forEach(p=>{const tx=p.hx+(RM?0:Math.sin(t/900+p.k*9)*3),ty=p.hy+(RM?0:Math.cos(t/800+p.k*9)*3);p.x+=(tx-p.x)*.04;p.y+=(ty-p.y)*.04;const dx=p.x-m.x,dy=p.y-m.y,d=Math.hypot(dx,dy);if(d<90){p.x+=dx/d*(90-d)*.2;p.y+=dy/d*(90-d)*.2}x.fillStyle=p.k<.5?'#20e0ff':p.k<.8?'#ff3df0':'#ffb020';x.globalAlpha=.8;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()})}requestAnimationFrame(f)})(0)})();
// feedback negativo
const t4=$('#t4');function fb(){const v=+t4.value,n=['#n1','#n2','#n3'].map($);n.forEach(e=>e.classList.remove('hot'));let s;if(v>66){n[2].classList.add('hot');s='T4 alto: hipotálamo e hipófise reduzem TRH e TSH; a tireoide desacelera.'}else if(v<34){n[0].classList.add('hot');n[1].classList.add('hot');s='T4 baixo: TRH e TSH aumentam e estimulam a tireoide a produzir mais T4.'}else s='T4 em equilíbrio: o sistema mantém produção estável.';$('#fbt').textContent=s}
t4.oninput=fb;fb();
// simulador de glicemia (unidades ilustrativas)
(()=>{const c=$('#gc'),x=c.getContext('2d');let g=90,i=0,l=0,ca=0,ex=0,H=[];
$('#eat').onclick=()=>ca+=70;$('#ex').onclick=()=>ex=240;
setInterval(()=>{g+=ca*.03;ca*=.97;g-=i*.012+(ex>0?.25:0);ex--;g+=l*.01+(90-g)*.003;i+=(Math.max(0,g-90)*.9-i)*.06;l+=(Math.max(0,88-g)*4-l)*.06;H.push([g,i,l]);if(H.length>400)H.shift();
x.clearRect(0,0,800,260);[['#20e0ff',0,1],['#ff3df0',1,2],['#ffb020',2,3]].forEach(([col,k,sc])=>{x.strokeStyle=col;x.lineWidth=3;x.beginPath();H.forEach((p,j)=>{const y=260-(k?p[k]*2.2+10:(p[0]-40)*1.6);j?x.lineTo(j*2,y):x.moveTo(0,y)});x.stroke()})},60)})();
// quiz
const Q=[['Hormônios chegam às células-alvo por qual via?',['Sangue','Ductos da pele','Nervos'],0,'Glândulas endócrinas lançam hormônios no sangue.'],
['Qual hormônio reduz a glicose no sangue?',['Glucagon','Insulina','Cortisol'],1,'A insulina favorece a entrada de glicose nas células.'],
['Qual glândula é chamada de "centro de comando"?',['Timo','Pineal','Hipófise'],2,'A hipófise controla várias outras glândulas, sob comando do hipotálamo.'],
['A ocitocina no parto é exemplo de…',['Feedback positivo','Feedback negativo','Reflexo nervoso'],0,'O efeito reforça o estímulo até o nascimento.'],
['A melatonina é produzida pela…',['Tireoide','Pineal','Adrenal'],1,'Ela regula o ritmo circadiano.']];
let qi=0,pt=0;function rq(){const z=$('#qz');if(qi>=Q.length){z.innerHTML=`<h3>Pontuação: ${pt}/${Q.length}</h3><button id="rr">Refazer</button>`;$('#rr').onclick=()=>{qi=pt=0;rq()};return}
const q=Q[qi];z.innerHTML=`<div class="q"><h3>${qi+1}/${Q.length}. ${q[0]}</h3>${q[1].map((o,i)=>`<button data-i="${i}">${o}</button>`).join('')}<p id="ex2" aria-live="polite"></p></div>`;
z.querySelectorAll('button').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;if(i==q[2])pt++;z.querySelectorAll('button').forEach((x,j)=>{x.disabled=true;x.classList.add(j==q[2]?'ok':'no'==1?'':j==i?'no':'')});b.classList.add(i==q[2]?'ok':'no');$('#ex2').textContent=q[3];setTimeout(()=>{qi++;rq()},2200)})}rq();
// ===== modelo 3D (Three.js) + fallback SVG =====
let sel=null;
const stat=m=>{const e=$('#m3st');if(e)e.textContent=m};
function fallback(){const cv=$('#cv'),st=cv.parentNode;cv.remove();$('.bar').hidden=false;stat('Modelo 3D indisponível neste dispositivo: mostrando uma versão simplificada.');
const sv=`<svg id="fb" viewBox="0 0 200 400" role="img" aria-label="Corpo humano com glândulas"><g fill="none" stroke="#20e0ff" stroke-width="2"><circle cx="100" cy="40" r="22"/><rect x="72" y="70" width="56" height="200" rx="22"/><rect x="40" y="75" width="20" height="170" rx="10"/><rect x="140" y="75" width="20" height="170" rx="10"/><rect x="76" y="270" width="22" height="115" rx="10"/><rect x="102" y="270" width="22" height="115" rx="10"/></g>${G.map(g=>[1,g.m?-1:1].filter((v,i,a)=>!(i&&!g.m)).map(s=>`<circle class="fg" data-id="${g.id}" cx="${100+g.p[0]*200*s}" cy="${380-g.p[1]*200}" r="${Math.max(5,g.s*110)}" fill="#${g.c.toString(16).padStart(6,'0')}" tabindex="0" role="button" aria-label="${g.n}"/>`).join('')).join('')}</svg>`;
st.insertAdjacentHTML('afterbegin',sv);st.querySelectorAll('.fg').forEach(e=>{const go=()=>info(G.find(g=>g.id==e.dataset.id));e.onclick=go;e.onkeydown=k=>k.key=='Enter'&&go()})}
addEventListener('load',()=>{try{if(!window.THREE)throw 0;init3D()}catch(e){console.error(e);fallback()}});
function init3D(){
const cv=$('#cv'),box=cv.parentNode,CAL=/[?&]calibrar(?:[=&#]|$)/.test(location.search);
const R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});R.setPixelRatio(Math.min(devicePixelRatio,MOB?1.5:1.75));
const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(40,1,.05,50),grp=new THREE.Group();sc.add(grp);
const body=new THREE.Group(),gl=[],hits=[],GM={},v3=new THREE.Vector3();grp.add(body);

// --- material holográfico (compartilhado por todo o corpo): brilho nas bordas (fresnel) + faixa de varredura ---
const HM=new THREE.ShaderMaterial({uniforms:{uC:{value:new THREE.Color(HOLO_CFG.color)},uT:{value:0},uA:{value:HOLO_CFG.base},uR:{value:HOLO_CFG.rim}},
transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
vertexShader:`varying vec3 vN;varying vec3 vV;varying float vH;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vH=(modelMatrix*vec4(position,1.0)).y;gl_Position=projectionMatrix*mv;}`,
fragmentShader:`uniform vec3 uC;uniform float uT;uniform float uA;uniform float uR;varying vec3 vN;varying vec3 vV;varying float vH;
void main(){float f=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.4);float s=smoothstep(0.78,1.0,0.5+0.5*sin(vH*70.0-uT*1.6))*0.16;float a=uA+f*uR+s;gl_FragColor=vec4(uC*(0.8+f*1.3),a);}`});

// --- corpo procedural (plano B / enquanto o GLB carrega): proporções de um adulto com altura 1.8 ---
const lathe=(pts,seg)=>new THREE.LatheGeometry(new THREE.SplineCurve(pts.map(p=>new THREE.Vector2(p[0],p[1]))).getPoints(pts.length*6).map(p=>new THREE.Vector2(Math.max(0,p.x),p.y)),seg||28);
function procBody(){const g=new THREE.Group();g.userData.proc=1;
const mesh=(geo,x,y,z,sx,sy,sz)=>{const m=new THREE.Mesh(geo,HM);m.position.set(x,y,z);m.scale.set(sx||1,sy||1,sz||1);m.renderOrder=1;g.add(m);return m};
const ball=(p,r,sx,sy,sz)=>mesh(new THREE.SphereGeometry(r,16,12),p[0],p[1],p[2],sx,sy,sz);
const limb=(a,b,r0,r1)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),L=d.length();const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r0,L,14,1,true),HM);m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.renderOrder=1;g.add(m)};
// tronco: quadril → cintura → tórax → ombros → base do pescoço (achatado em z)
mesh(lathe([[0,.86],[.1,.87],[.158,.92],[.17,.98],[.15,1.06],[.135,1.14],[.145,1.22],[.165,1.31],[.178,1.39],[.16,1.45],[.1,1.495],[.058,1.52],[0,1.53]],32),0,0,0,1,1,.66);
// pescoço entra na cabeça (cabeça integrada, sem flutuar)
mesh(new THREE.CylinderGeometry(.046,.054,.15,20,1,true),0,1.535,0);
// cabeça: crânio e mandíbula numa só curva (largura 0.155, profundidade 0.195, altura 0.235)
mesh(lathe([[0,-.1175],[.02,-.113],[.042,-.095],[.062,-.06],[.074,-.015],[.0775,.03],[.072,.075],[.052,.105],[.022,.1175],[0,.1175]],28),0,1.6825,.004,1,1,1.26);
[-1,1].forEach(s=>{
 ball([s*.215,1.43,0],.05);limb([s*.215,1.43,0],[s*.245,1.1,0],.04,.033);ball([s*.245,1.1,0],.036);limb([s*.245,1.1,0],[s*.26,.84,.02],.033,.025);ball([s*.26,.84,.02],.028);ball([s*.265,.77,.02],.04,.7,1.5,.45);
 ball([s*.088,.9,0],.08);limb([s*.088,.9,0],[s*.09,.5,.01],.078,.05);ball([s*.09,.5,.01],.05);limb([s*.09,.5,.01],[s*.08,.075,-.005],.05,.028);ball([s*.08,.075,-.005],.03);ball([s*.085,.03,.07],1,.045,.03,.12)});
return g}
// plataforma sob os pés
const rg=new THREE.Mesh(new THREE.RingGeometry(.3,.315,64),new THREE.MeshBasicMaterial({color:0x20e0ff,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));rg.rotation.x=-Math.PI/2;rg.position.y=.002;body.add(rg);

// --- modelo GLB: normaliza escala/posição e aplica o material holográfico ---
let cur=null,srcScene=null,kind='procedural',tris=0;
const disp=o=>o.traverse(c=>{c.geometry&&c.geometry.dispose()});
function setModel(node,k,t){if(cur){body.remove(cur);if(cur.userData.proc)disp(cur)}cur=node;kind=k;tris=t||0;body.add(node);calInfo()}
function fitModel(src){src.updateMatrixWorld(true);const wrap=new THREE.Group();let n=0;
 src.traverse(o=>{if(!o.isMesh||!o.geometry)return;const geo=o.geometry;if(!geo.attributes.normal)geo.computeVertexNormals();const m=new THREE.Mesh(geo,HM);o.matrixWorld.decompose(m.position,m.quaternion,m.scale);m.renderOrder=1;wrap.add(m);n+=(geo.index?geo.index.count:geo.attributes.position.count)/3});
 if(!wrap.children.length)throw new Error('GLB sem malhas');
 wrap.rotation.y=MODEL.rotY*Math.PI/180;const fit=new THREE.Group();fit.add(wrap);fit.updateMatrixWorld(true);
 const bx=new THREE.Box3().setFromObject(fit),sz=bx.getSize(new THREE.Vector3()),ct=bx.getCenter(new THREE.Vector3()),s=MODEL.height/sz.y;
 fit.scale.setScalar(s);fit.position.set(-ct.x*s+MODEL.offset[0],-bx.min.y*s+MODEL.offset[1],-ct.z*s+MODEL.offset[2]);return{fit,tris:n}}
function loadModel(){if(!THREE.GLTFLoader){stat('Carregador de modelos indisponível: usando o corpo procedural.');return}
 stat('Carregando modelo anatômico…');
 new THREE.GLTFLoader().load(MODEL.url,gltf=>{try{srcScene=gltf.scene;const r=fitModel(srcScene);setModel(r.fit,'GLB',r.tris);stat('Modelo anatômico carregado.'+(MOB&&r.tris>250000?' Aviso: modelo pesado para celular.':''))}catch(e){console.warn(e);stat('Não foi possível usar o GLB: mostrando o corpo procedural.')}},undefined,e=>{console.info('GLB não carregado:',e);stat('Modelo '+MODEL.url+' não encontrado: mostrando o corpo procedural.')})}
setModel(procBody(),'procedural');

// --- glândulas (posições vêm de GLAND_POSITIONS) ---
G.forEach(g=>{(g.m?[1,-1]:[1]).forEach(s=>{const mt=new THREE.MeshBasicMaterial({color:g.c,transparent:true});const m=new THREE.Mesh(new THREE.SphereGeometry(g.s,20,16),mt);m.scale.x=g.sx||1;m.position.set(g.p[0]*s,g.p[1],g.p[2]);m.renderOrder=3;m.userData={g,mt,s};
 const h=new THREE.Mesh(new THREE.SphereGeometry(Math.max(g.s*1.7,.028),8,6),new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false}));h.userData.g=g;m.add(h);hits.push(h);
 grp.add(m);gl.push(m);if(s==1)GM[g.id]=m})});

// --- rótulos curtos com linhas de chamada (nome completo só no hover/foco/toque) ---
const lb=$('#lbs'),ll=$('#ll'),NS='http://www.w3.org/2000/svg',LBL={};let W=1,H=1;
G.forEach(g=>{const b=document.createElement('button');b.type='button';b.hidden=true;b.className='lb '+LABEL_SIDE[g.id];b.dataset.id=g.id;b.setAttribute('aria-label',g.n);b.innerHTML=`${LABEL_SHORT[g.id]||g.n}<span class="tip" aria-hidden="true">${g.n}</span>`;b.onclick=()=>pick(g);lb.appendChild(b);
 const ln=document.createElementNS(NS,'line'),dt=document.createElementNS(NS,'circle');dt.setAttribute('r',2.5);ll.append(ln,dt);LBL[g.id]={b,ln,dt,w:0,h:0}});
function layout(){const cols={l:[],r:[]};
 G.forEach(g=>{const o=LBL[g.id],m=GM[g.id];let ok=m.visible;if(ok){m.getWorldPosition(v3);v3.project(cam);ok=v3.z<1&&Math.abs(v3.x)<1.04&&Math.abs(v3.y)<1.04}
  if(!ok){if(!o.b.hidden){o.b.hidden=true;o.ln.style.display=o.dt.style.display='none'}return}
  if(o.b.hidden){o.b.hidden=false;o.ln.style.display=o.dt.style.display=''}
  if(!o.w){o.w=o.b.offsetWidth;o.h=o.b.offsetHeight}
  cols[LABEL_SIDE[g.id]].push({g,o,x:(v3.x*.5+.5)*W,y:(-v3.y*.5+.5)*H,ly:0})});
 const gap=MOB?22:25,top=14,bot=H-14;
 ['l','r'].forEach(k=>{const a=cols[k].sort((p,q)=>p.y-q.y);
  a.forEach((it,i)=>{it.ly=Math.max(i?a[i-1].ly+gap:top,it.y)});
  for(let i=a.length-1;i>=0;i--){const lim=i<a.length-1?a[i+1].ly-gap:bot;if(a[i].ly>lim)a[i].ly=lim}
  a.forEach((it,i)=>{if(i&&it.ly<a[i-1].ly+gap)it.ly=a[i-1].ly+gap;
   const o=it.o,left=k=='l',bx=left?8:W-8-o.w,lx=left?8+o.w+3:W-8-o.w-3,dim=sel&&sel!==it.g;
   o.b.style.transform=`translate(${bx}px,${it.ly-o.h/2}px)`;o.b.style.opacity=dim?.25:1;o.b.classList.toggle('exp',sel===it.g);
   o.ln.setAttribute('x1',lx);o.ln.setAttribute('y1',it.ly);o.ln.setAttribute('x2',it.x);o.ln.setAttribute('y2',it.y);o.ln.style.opacity=dim?.15:.6;
   o.dt.setAttribute('cx',it.x);o.dt.setAttribute('cy',it.y);o.dt.style.opacity=dim?.2:1})})}

// --- partículas de sangue ---
const N=160,pg=new THREE.BufferGeometry(),pa=new Float32Array(N*3),BY0=.55,BY1=1.6;for(let i=0;i<N;i++){pa[i*3]=(Math.random()-.5)*.06;pa[i*3+1]=BY0+Math.random()*(BY1-BY0);pa[i*3+2]=(Math.random()-.5)*.04}
pg.setAttribute('position',new THREE.BufferAttribute(pa,3));const pts=new THREE.Points(pg,new THREE.PointsMaterial({color:0xff3d6a,size:.022,blending:THREE.AdditiveBlending,transparent:true}));pts.visible=false;grp.add(pts);

let sex='f',tgt=new THREE.Vector3(0,.9,0),dist=3.5,ry=0,ty=null,drag=0,last=null,visible=true,pin=new Map(),pd=0;
const view=()=>{const w=box.clientWidth,h=box.clientHeight;W=w;H=h;R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();for(const k in LBL)LBL[k].w=0};view();addEventListener('resize',view);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{for(const k in LBL)LBL[k].w=0});
function setSex(){gl.forEach(m=>{const s=m.userData.g.sex;m.visible=!s||s==sex})}setSex();
function pick(g){sel=g;info(g);ty=0;ry=ry%(Math.PI*2);if(ry>Math.PI)ry-=Math.PI*2;tgt.set(g.p[0],g.p[1],g.p[2]);dist=GLAND_FLY[g.id]||.9;if(CAL)calSync(g.id)}
function reset(){sel=null;tgt.set(0,.9,0);dist=3.5}
$('#rs').onclick=reset;$('#sx').onclick=e=>{sex=sex=='f'?'m':'f';e.target.textContent='Corpo: '+(sex=='f'?'feminino':'masculino');setSex()};
document.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-l]').forEach(x=>x.classList.remove('on'));b.classList.add('on');body.visible=b.dataset.l!='g';pts.visible=b.dataset.l=='v'});
window.__E3={grp,gl,reset,getSex:()=>sex};const ray=new THREE.Raycaster(),mv=new THREE.Vector2();
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pin.set(e.pointerId,e);drag=0;last=e.clientX;ty=null;if(pin.size==2){const a=[...pin.values()];pd=Math.hypot(a[0].clientX-a[1].clientX,a[0].clientY-a[1].clientY)}});
cv.addEventListener('pointermove',e=>{if(!pin.has(e.pointerId))return;pin.set(e.pointerId,e);if(pin.size==2){const a=[...pin.values()],d=Math.hypot(a[0].clientX-a[1].clientX,a[0].clientY-a[1].clientY);dist=Math.max(.35,Math.min(6,dist*pd/d));pd=d;drag=9;return}drag+=Math.abs(e.clientX-last);ry+=(e.clientX-last)*.01;last=e.clientX});
cv.addEventListener('pointerup',e=>{pin.delete(e.pointerId);if(drag<6){const r=cv.getBoundingClientRect();mv.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mv,cam);const h=ray.intersectObjects(hits.filter(h=>h.parent.visible))[0];if(h)pick(h.object.userData.g)}});
cv.addEventListener('pointercancel',e=>pin.delete(e.pointerId));
cv.addEventListener('wheel',e=>{e.preventDefault();dist=Math.max(.35,Math.min(6,dist*(1+e.deltaY*.001)))},{passive:false});
new IntersectionObserver(e=>visible=e[0].isIntersecting).observe(box);

// --- modo calibração (?calibrar) ---
let calId=null;
function calOut(){if(!CAL)return;const g=G.find(x=>x.id==calId);$('#calx').textContent=g?`${g.n}: x ${g.p[0].toFixed(3)} · y ${g.p[1].toFixed(3)} · z ${g.p[2].toFixed(3)}`:'Nenhuma glândula selecionada (use a lista, um rótulo ou clique no 3D).';
 $('#calt').value='const GLAND_POSITIONS = {\n'+G.map(x=>`  ${x.id}: [${x.p.map(v=>v.toFixed(3)).join(', ')}],   // ${x.n}`).join('\n')+'\n};\n// MODEL.rotY = '+MODEL.rotY+';'}
function calInfo(){if(!CAL)return;$('#calm').textContent=`Corpo atual: ${kind}${tris?' · '+Math.round(tris/1000)+'k triângulos':''} · altura ${MODEL.height} · rotY ${MODEL.rotY}°`}
function calSync(id){calId=id;$('#calsel').value=id;calOut()}
function calMove(d){const g=G.find(x=>x.id==calId);if(!g)return;g.p=g.p.map((v,i)=>+(v+d[i]).toFixed(4));gl.forEach(m=>{if(m.userData.g===g)m.position.set(g.p[0]*m.userData.s,g.p[1],g.p[2])});tgt.set(g.p[0],g.p[1],g.p[2]);calOut()}
if(CAL){$('#cal').hidden=false;const cs=$('#calsel');cs.innerHTML=G.map(g=>`<option value="${g.id}">${g.n}</option>`).join('');cs.value='';
 cs.onchange=()=>{const g=G.find(x=>x.id==cs.value);if(g)pick(g)};
 $('#calf').onclick=()=>{ty=0};
 $('#calr').onclick=()=>{MODEL.rotY=(MODEL.rotY+180)%360;if(srcScene){const r=fitModel(srcScene);setModel(r.fit,'GLB',r.tris)}else calInfo();calOut()};
 $('#calc').onclick=()=>{const ta=$('#calt');const done=()=>stat('GLAND_POSITIONS copiado: cole no script.js.');if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(ta.value).then(done,()=>{ta.select();document.execCommand('copy');done()});else{ta.select();document.execCommand('copy');done()}};
 addEventListener('keydown',e=>{if(!calId||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;const st=e.shiftKey?.001:e.ctrlKey?.02:.005,k=e.key;let d=null;
  if(k=='ArrowLeft')d=[-st,0,0];else if(k=='ArrowRight')d=[st,0,0];else if(k=='ArrowUp')d=[0,st,0];else if(k=='ArrowDown')d=[0,-st,0];else if(k=='PageUp'||k=='e'||k=='E')d=[0,0,st];else if(k=='PageDown'||k=='q'||k=='Q')d=[0,0,-st];
  if(d){e.preventDefault();calMove(d)}else if(k=='Escape'){calId=null;cs.value='';calOut()}});
 calInfo();calOut()}

loadModel();
const look=tgt.clone();let t0=0;
(function loop(t){requestAnimationFrame(loop);if(!visible)return;const dt=t-t0;t0=t;
if(ty!==null)ry+=(ty-ry)*.06;else if(!RM&&!sel&&!pin.size&&!CAL)ry+=.0025;grp.rotation.y=ry;
look.lerp(tgt,.06);cam.position.lerp(v3.set(look.x,look.y+(sel?0:.2),dist+look.z),.06);cam.lookAt(look);
HM.uniforms.uT.value=RM?0:t/1000;
gl.forEach((m,i)=>{const u=m.userData,p=RM?1:1+.12*Math.sin(t/350+i);m.scale.set((u.g.sx||1)*p,p,p);u.mt.opacity+=((!sel||sel==u.g?1:.12)-u.mt.opacity)*.1});
if(pts.visible)for(let i=0;i<N;i++){pa[i*3+1]+=.003+(i%5)*.0006;if(pa[i*3+1]>BY1)pa[i*3+1]=BY0}pg.attributes.position.needsUpdate=true;
window.__tick&&window.__tick(t);R.render(sc,cam);layout()})(0)}
// ===== acréscimos: seções de conteúdo =====
const mk=(sel,arr,f)=>{$(sel).innerHTML=arr.map(f).join('')};
mk('#dz',[
['Diabetes tipo 1','Doença geralmente autoimune: o sistema imunológico destrói as células beta do pâncreas, e o corpo passa a produzir pouca ou nenhuma insulina. Sintomas clássicos: muita sede, urinar muito, fome e perda de peso. O tratamento exige reposição de insulina.'],
['Diabetes tipo 2','O corpo responde mal à insulina (resistência à insulina) e, com o tempo, o pâncreas pode não compensar. Está associado a fatores como excesso de peso, sedentarismo e histórico familiar. O tratamento inclui hábitos de vida, medicamentos e, às vezes, insulina.'],
['Hipotireoidismo','Pouco T3 e T4: o metabolismo fica mais lento. Pode causar cansaço, sensibilidade ao frio, pele seca e constipação. Uma causa comum é a tireoidite de Hashimoto, de origem autoimune.'],
['Hipertireoidismo','Excesso de hormônios da tireoide: metabolismo acelerado. Pode causar palpitações, tremores, perda de peso e intolerância ao calor. Uma causa comum é a doença de Graves, também autoimune.'],
['Síndrome de Cushing','Excesso prolongado de cortisol, por exemplo pelo uso de corticoides ou por tumores. Pode causar acúmulo de gordura no tronco, face arredondada, estrias, fraqueza muscular, pressão alta e glicose elevada.'],
['Doença de Addison','Insuficiência das adrenais: falta de cortisol e, frequentemente, de aldosterona. Pode causar cansaço, perda de peso, pressão baixa e escurecimento da pele. Muitas vezes é autoimune.'],
['Acromegalia','Excesso de GH em adultos, geralmente por um tumor benigno da hipófise. Provoca crescimento de mãos, pés e ossos da face, pois os ossos longos já não crescem em comprimento.'],
['Nanismo hipofisário','Deficiência de GH na infância, que reduz o crescimento. Em geral as proporções do corpo são mantidas. O acompanhamento médico pode incluir reposição de GH.'],
['Diabetes insipidus','Falta de ADH (ou resposta renal reduzida a ele): os rins perdem muita água, causando grande volume de urina diluída e muita sede. Apesar do nome parecido, não tem relação com a glicose do diabetes mellitus.'],
['SOP (síndrome dos ovários policísticos)','Distúrbio hormonal comum em mulheres em idade reprodutiva. Pode envolver ciclos irregulares, excesso de hormônios masculinos (acne, pelos) e, em muitos casos, resistência à insulina. Diagnóstico e tratamento são individualizados.']
],d=>`<details><summary>${d[0]}</summary><p>${d[1]}</p></details>`);
mk('#tl',[
['Infância','GH e hormônios da tireoide são essenciais para o crescimento e para o desenvolvimento do cérebro.'],
['Adolescência','O hipotálamo libera GnRH, que estimula a hipófise (LH e FSH) e as gônadas a produzir hormônios sexuais: é a puberdade.'],
['Gravidez','A placenta produz hormônios como hCG, progesterona e estrogênio, que sustentam a gestação. No parto, a ocitocina contrai o útero; na amamentação, prolactina e ocitocina atuam.'],
['Menopausa','Os ovários reduzem a produção de estrogênio e progesterona, e os ciclos menstruais cessam.'],
['Envelhecimento','Mudanças graduais: GH e hormônios sexuais tendem a diminuir, e a resposta à insulina pode piorar. A variação entre pessoas é grande.']
],d=>`<li class="tli"><h3>${d[0]}</h3><p>${d[1]}</p></li>`);
mk('#hb',[
['😴 Sono','A melatonina sobe no escuro, e o GH é liberado principalmente durante o sono profundo. Dormir mal pode alterar cortisol, apetite e controle da glicose.'],
['🥗 Alimentação','Refeições estimulam a insulina. Excesso crônico de açúcar e ganho de gordura favorecem a resistência à insulina. O iodo é necessário para produzir T3 e T4.'],
['🏃 Exercício','Músculos em atividade captam glicose e o exercício melhora a sensibilidade à insulina. Também libera adrenalina e favorece o sono.'],
['🧘 Estresse','O estresse ativa o eixo hipotálamo-hipófise-adrenal e libera cortisol. Se for crônico, pode afetar sono, pressão e glicose.']
],d=>`<article><h3>${d[0]}</h3><p>${d[1]}</p></article>`);
mk('#mt',[
['Comer açúcar causa diabetes tipo 1.','Mito','O tipo 1 é autoimune. Já o tipo 2 tem vários fatores de risco, incluindo excesso de peso e sedentarismo.'],
['Hormônios só importam na puberdade.','Mito','Eles atuam a vida toda: metabolismo, sono, estresse, glicose, água e sal.'],
['Só as glândulas clássicas produzem hormônios.','Mito','Rins, coração, tecido adiposo, estômago e intestino também produzem hormônios.'],
['Dormir bem influencia os hormônios.','Verdade','Sono afeta melatonina, GH, cortisol e o controle da glicose.'],
['Diabetes insipidus é o mesmo que diabetes mellitus.','Mito','São doenças diferentes: o insipidus envolve ADH e água, e o mellitus envolve insulina e glicose.'],
['Homens também produzem estrogênio.','Verdade','Em pequena quantidade, e mulheres produzem testosterona. Ambos têm os dois tipos de hormônio.']
],d=>`<button class="fc" aria-pressed="false"><span><b>Mito ou verdade?</b>${d[0]}</span><span><b>${d[1]}!</b>${d[2]}</span></button>`);
document.querySelectorAll('.fc').forEach(b=>b.onclick=()=>{b.classList.toggle('flip');b.setAttribute('aria-pressed',b.classList.contains('flip'))});
const tio=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('in')),{threshold:.2});document.querySelectorAll('.tli').forEach(l=>tio.observe(l));
// glossário
const GL=[['Hormônio','Mensageiro químico produzido por glândulas e levado pelo sangue até as células-alvo.'],['Glândula endócrina','Libera hormônios direto no sangue, sem ductos.'],['Glândula exócrina','Libera secreções por ductos, como suor e saliva.'],['Célula-alvo','Célula que tem receptor para determinado hormônio.'],['Receptor','Proteína que reconhece e se liga a um hormônio específico.'],['Segundo mensageiro','Molécula dentro da célula, como o AMPc, que transmite o sinal do hormônio peptídico.'],['Feedback negativo','Mecanismo em que o efeito do hormônio reduz sua própria produção.'],['Feedback positivo','Mecanismo em que o efeito reforça o estímulo, como a ocitocina no parto.'],['Homeostase','Equilíbrio do meio interno do organismo.'],['Hipotálamo','Região do cérebro que liga o sistema nervoso ao endócrino e comanda a hipófise.'],['Hipófise','Glândula na base do cérebro, dividida em adeno-hipófise e neuro-hipófise.'],['Adeno-hipófise','Parte anterior da hipófise, que produz GH, TSH, ACTH, FSH, LH e prolactina.'],['Neuro-hipófise','Parte posterior da hipófise, que libera ADH e ocitocina produzidos no hipotálamo.'],['Glicemia','Concentração de glicose no sangue.'],['Insulina','Hormônio do pâncreas que ajuda as células a captar glicose.'],['Glucagon','Hormônio do pâncreas que eleva a glicose no sangue.'],['Cortisol','Hormônio esteroide das adrenais ligado à resposta ao estresse.'],['Ritmo circadiano','Ciclo biológico de cerca de 24 horas, como o do sono e vigília.'],['Autoimune','Condição em que o sistema imunológico ataca tecidos do próprio corpo.'],['Resistência à insulina','Resposta reduzida das células à ação da insulina.'],['Puberdade','Fase de amadurecimento sexual, iniciada por sinais hormonais.'],['Menopausa','Fim dos ciclos menstruais, com queda de estrogênio e progesterona.']].sort((a,b)=>a[0].localeCompare(b[0],'pt'));
$('#gd').innerHTML=GL.map(g=>`<dt>${g[0]}</dt><dd>${g[1]}</dd>`).join('');
$('#gq').oninput=e=>{const v=e.target.value.toLowerCase();$('#gd').querySelectorAll('dt').forEach(t=>{const d=t.nextElementSibling,h=!(t.textContent+d.textContent).toLowerCase().includes(v);t.hidden=d.hidden=h})};
// quiz ampliado: 15 questões embaralhadas
Q.push(
['Qual hormônio é liberado pelas adrenais na reação de "luta ou fuga"?',['Adrenalina','Melatonina','Calcitonina'],0,'A adrenalina (medula adrenal) acelera o coração e prepara o corpo para agir.'],
['A falta de ADH causa…',['Diabetes insipidus','Acromegalia','Doença de Addison'],0,'Sem ADH, os rins perdem muita água, gerando muita urina e sede.'],
['Qual hormônio da hipófise estimula a tireoide?',['ACTH','TSH','Prolactina'],1,'O TSH estimula a tireoide a produzir T3 e T4.'],
['O excesso de GH em adultos causa…',['Acromegalia','Nanismo hipofisário','Síndrome de Cushing'],0,'Causa crescimento de mãos, pés e ossos da face.'],
['O diabetes tipo 1 é geralmente causado por…',['Destruição autoimune das células beta','Excesso de cortisol','Falta de iodo'],0,'As células beta produzem insulina e são destruídas.'],
['Calcitonina e PTH ajudam a regular…',['A glicose','O cálcio no sangue','O sono'],1,'A calcitonina reduz e o PTH eleva o cálcio no sangue.'],
['Hormônios esteroides…',['Atravessam a membrana e agem em receptores dentro da célula','Agem só em receptores na superfície','Não precisam de receptor'],0,'São lipossolúveis e alteram a atividade dos genes.'],
['A neuro-hipófise…',['Libera ADH e ocitocina','Produz TSH e ACTH','Produz insulina'],0,'Esses hormônios são produzidos no hipotálamo e liberados por ela.'],
['Um segundo mensageiro é…',['Uma molécula dentro da célula que transmite o sinal do hormônio','Um segundo hormônio igual ao primeiro','Um nervo auxiliar'],0,'Por exemplo, o AMPc, que amplifica a mensagem do hormônio peptídico.'],
['A doença de Addison é…',['Insuficiência das adrenais','Excesso de cortisol','Excesso de T4'],0,'As adrenais produzem pouco cortisol e, frequentemente, pouca aldosterona.']);
const shuf=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(v=>v[1]);
Q.forEach(q=>q.ans=q[1][q[2]]);
const _rq=rq;rq=function(){if(qi==0){Q.sort(()=>Math.random()-.5);Q.forEach(q=>{q[1]=shuf(q[1]);q[2]=q[1].indexOf(q.ans)})}_rq()};rq();
// ===== jogo de arrastar =====
(()=>{const D=[['Insulina','Pâncreas','Baixa a glicose no sangue'],['Cortisol','Adrenais','Ajuda na resposta ao estresse'],['T4 (tiroxina)','Tireoide','Controla o metabolismo'],['Melatonina','Pineal','Regula o ciclo sono-vigília'],['GH','Hipófise','Estimula o crescimento'],['PTH','Paratireoides','Eleva o cálcio no sangue']],root=$('#jg');let ok,er,sl;
function build(){ok=er=0;sl=null;root.innerHTML=`<div>${D.map((d,i)=>`<div class="jr"><b>${d[0]}</b><span class="slot" data-t="g" data-h="${i}" tabindex="0" role="button" aria-label="Glândula de ${d[0]}">glândula</span><span class="slot" data-t="f" data-h="${i}" tabindex="0" role="button" aria-label="Função de ${d[0]}">função</span></div>`).join('')}</div><div class="pool" id="pool"></div><p id="js" aria-live="polite"></p><button id="jre" hidden>Jogar de novo</button>`;
const p=$('#pool');shuf(D.flatMap((d,i)=>[['g',d[1],i],['f',d[2],i]])).forEach(([t,x,h])=>{const c=document.createElement('span');c.className='chip '+t;c.textContent=x;c.dataset.t=t;c.dataset.h=h;c.tabIndex=0;c.setAttribute('role','button');p.appendChild(c)});$('#jre').onclick=build;sc()}
function sc(){$('#js').textContent=`Acertos: ${ok}/12 · Erros: ${er}`+(ok==12?' — Parabéns, você ligou tudo!':'');$('#jre').hidden=ok<12}
function sel(c){if(sl)sl.classList.remove('sel');sl=c;c.classList.add('sel')}
function drop(c,s){if(s.dataset.done||c.dataset.t!=s.dataset.t)return;if(c.dataset.h==s.dataset.h){s.textContent=c.textContent;s.classList.add('good');s.dataset.done=1;c.remove();ok++}else{er++;s.classList.add('bad');setTimeout(()=>s.classList.remove('bad'),600);c.classList.remove('sel')}sl=null;sc()}
root.addEventListener('pointerdown',e=>{const c=e.target.closest('.chip');if(!c)return;c.setPointerCapture(e.pointerId);const x0=e.clientX,y0=e.clientY;let mv=0;
c.onpointermove=ev=>{const dx=ev.clientX-x0,dy=ev.clientY-y0;if(Math.abs(dx)+Math.abs(dy)>6)mv=1;if(mv){c.style.transform=`translate(${dx}px,${dy}px)`;c.classList.add('drag')}};
c.onpointerup=ev=>{c.onpointermove=c.onpointerup=null;c.style.pointerEvents='none';const el=document.elementFromPoint(ev.clientX,ev.clientY);c.style.pointerEvents='';c.style.transform='';c.classList.remove('drag');if(mv){const s=el&&el.closest('.slot');if(s)drop(c,s)}else sel(c)}});
root.addEventListener('click',e=>{const s=e.target.closest('.slot');if(s&&sl)drop(sl,s)});
root.addEventListener('keydown',e=>{if(e.key=='Enter'){const c=e.target.closest('.chip');if(c)sel(c);else if(e.target.closest('.slot')&&sl)drop(sl,e.target.closest('.slot'))}});
build()})();
// ===== acréscimos: eixo, estresse, melatonina, sangue =====
const MOB=matchMedia('(pointer:coarse)').matches||innerWidth<700;
const loopOn=(el,fn,thr,cb)=>{let id=0,vis=0,l=0;const f=t=>{fn(t,t-l);l=t;id=vis?requestAnimationFrame(f):0};new IntersectionObserver(e=>{vis=e[0].isIntersecting;cb&&cb(vis);if(vis&&!id){l=performance.now();id=requestAnimationFrame(f)}},{threshold:thr||.1}).observe(el)};
// --- eixo hipotálamo → hipófise → glândula-alvo ---
(()=>{const b=$('#ax'),lg=$('#axl'),LB=b.textContent,BO=[['hip'],['hpf'],['tir','adr','ova','tes'],['hip','hpf']];let on=0,step=0,iv=0,E,segs=[];
const TX=['<b>Etapa 1/4 · Comando.</b> O hipotálamo libera hormônios liberadores (como TRH, CRH e GnRH) que chegam à hipófise.','<b>Etapa 2/4 · Hipófise.</b> A hipófise responde liberando hormônios que estimulam outras glândulas: TSH, ACTH, FSH e LH.','<b>Etapa 3/4 · Glândulas-alvo.</b> Tireoide (T3 e T4), adrenais (cortisol) e gônadas (hormônios sexuais) produzem seus hormônios.','<b>Etapa 4/4 · Feedback.</b> Os hormônios finais voltam ao hipotálamo e à hipófise e freiam o estímulo (feedback negativo).'];
const P=(id,s=1)=>{const g=G.find(x=>x.id==id);return new THREE.Vector3(g.p[0]*s,g.p[1],g.p[2])};
function add(a,bb,st,col,sx){const d=bb.clone().sub(a),L=d.length();const m=new THREE.Mesh(new THREE.CylinderGeometry(.003,.003,L,6),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.05,blending:THREE.AdditiveBlending,depthWrite:false}));m.position.copy(a).add(bb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
const n=MOB?7:16,pa=new Float32Array(n*3),pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pa,3));const pt=new THREE.Points(pg,new THREE.PointsMaterial({color:col,size:.03,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));m.visible=pt.visible=false;E.grp.add(m,pt);segs.push({a,b:bb,st,sx,m,pt,pa,n})}
function build(){if(segs.length)return;const hip=P('hip'),hpf=P('hpf');add(hip,hpf,[0],0xff3df0);add(hpf,P('tir'),[1,2],0x20e0ff);add(P('tir'),hip,[3],0xffb020);
[1,-1].forEach(s=>{add(hpf,P('adr',s),[1,2],0xff6a3d);add(hpf,P('ova',s),[1,2],0xff7ac8,'f');add(hpf,P('tes',s),[1,2],0x5aa0ff,'m');add(P('adr',s),hip,[3],0xffb020);add(P('ova',s),hip,[3],0xffb020,'f');add(P('tes',s),hip,[3],0xffb020,'m')})}
function ui(){lg.hidden=!on;b.textContent=on?'■ Parar o eixo':LB;b.setAttribute('aria-pressed',on);if(on)lg.innerHTML=TX[step]+'<div class="axb"><button id="axn">Próxima ▶</button><button id="axs">■ Parar</button></div>';
if(!E)document.querySelectorAll('.fg').forEach(e=>e.style.opacity=on?(BO[step].includes(e.dataset.id)?1:.25):'')}
const tm=()=>{clearInterval(iv);if(on&&!RM)iv=setInterval(()=>{step=(step+1)%4;ui()},3200)};
function start(){on=1;step=0;E=window.__E3;if(E&&window.THREE){build();E.reset()}ui();tm()}
function stop(){on=0;clearInterval(iv);segs.forEach(s=>s.m.visible=s.pt.visible=false);ui()}
b.onclick=()=>on?stop():start();
lg.onclick=e=>{if(e.target.id=='axs')stop();if(e.target.id=='axn'){step=(step+1)%4;ui();tm()}};
window.__tick=t=>{if(!on||!E)return;const sx=E.getSex();segs.forEach(s=>{const ok=!s.sx||s.sx==sx,ac=ok&&s.st.includes(step);s.m.visible=ok;s.m.material.opacity+=((ac?.85:.05)-s.m.material.opacity)*.1;s.pt.visible=ac;if(ac){for(let i=0;i<s.n;i++){const u=RM?(i+.5)/s.n:((t/1300+i/s.n)%1),w=Math.sin(t/200+i)*.008;s.pa[i*3]=s.a.x+(s.b.x-s.a.x)*u+w;s.pa[i*3+1]=s.a.y+(s.b.y-s.a.y)*u;s.pa[i*3+2]=s.a.z+(s.b.z-s.a.z)*u+w}s.pt.geometry.attributes.position.needsUpdate=true}});
E.gl.forEach(m=>{if(BO[step].includes(m.userData.g.id))m.scale.multiplyScalar(1.6)})}})();
// --- estresse ---
(()=>{const sec=$('#estresse'),c=$('#sc'),x=c.getContext('2d');let W,H,ph=0,it=0,act=0,sp=0,P=[];const rs=()=>{W=c.width=c.clientWidth;H=c.height=c.clientHeight};rs();addEventListener('resize',rs);
const heart=(cx,cy,s,col)=>{x.save();x.translate(cx,cy);x.scale(s,s);x.beginPath();x.moveTo(0,12);x.bezierCurveTo(-30,-10,-18,-34,0,-18);x.bezierCurveTo(18,-34,30,-10,0,12);x.fillStyle=col;x.fill();x.restore()};
function draw(t,dt){dt=Math.min(dt||16,50);it+=((act?1:0)-it)*.02;const fq=1+2.4*it;ph+=dt*fq*Math.PI*2/1000;const b=Math.pow(Math.max(0,Math.sin(ph)),2),k=H/280,hx=W*.78,hy=H*.5;
x.fillStyle='#0a0f2a';x.fillRect(0,0,W,H);const ad=[[W*.14,H*.5],[W*.3,H*.5]];
ad.forEach(([ax,ay])=>{x.fillStyle='#5a1f2a';x.beginPath();x.ellipse(ax,ay+34*k,24*k,34*k,0,0,7);x.fill();x.fillStyle='#ffb020';x.shadowColor='#ffb020';x.shadowBlur=MOB?0:8+14*b;x.beginPath();x.ellipse(ax,ay-6*k,(12+5*b)*k,(8+3*b)*k,0,0,7);x.fill();x.shadowBlur=0});
sp+=dt*(.004+.022*it)*(MOB?.6:1);while(sp>1){sp--;if(P.length<(MOB?30:70)){const a=ad[Math.random()<.5?0:1],ky=Math.random()<.5;P.push({p:[a[0],a[1]-6*k,(a[0]+hx)/2,H*.06,hx,hy],u:0,v:ky?.011:.0035,c:ky?'#ff3df0':'#ffb020',r:ky?3:4.5})}}
P=P.filter(q=>(q.u+=q.v*dt/16*(1+it*.8))<1);P.forEach(q=>{const a=1-q.u,px=a*a*q.p[0]+2*a*q.u*q.p[2]+q.u*q.u*q.p[4],py=a*a*q.p[1]+2*a*q.u*q.p[3]+q.u*q.u*q.p[5];x.fillStyle=q.c;x.beginPath();x.arc(px,py,q.r,0,7);x.fill()});
heart(hx,hy,(2.1+.5*b)*k,'#ff3d6a');x.fillStyle='#cfd6ff';x.font=`${12}px Inter,sans-serif`;x.fillText('Adrenais',W*.14-6,H*.93);x.fillText('Coração',hx-24,H*.93);x.fillText(Math.round(fq*60)+' bpm (ilustrativo)',hx-52,H*.07)}
const mn=document.querySelector('main');
if(RM){draw(0,16)}else loopOn(sec,draw,.35,v=>{act=v;mn.classList.toggle('shake',v);if(!v){it=0;P=[]}})})();
// --- melatonina ---
(()=>{const sec=$('#melatonina'),c=$('#nt'),x=c.getContext('2d');let W,H,S=[],ss=null,on=0,off=0,id=0;
function rs(){W=c.width=innerWidth;H=c.height=innerHeight;S=[...Array(MOB?60:150)].map(()=>({x:Math.random()*W,y:Math.random()*H*.9,r:Math.random()*1.5+.3,ph:Math.random()*9}))}rs();addEventListener('resize',rs);
function draw(t){const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#02030f');g.addColorStop(1,'#0b1240');x.globalAlpha=.9;x.fillStyle=g;x.fillRect(0,0,W,H);x.globalAlpha=1;
S.forEach(s=>{x.globalAlpha=RM?.8:.45+.5*Math.sin(t/600+s.ph);x.fillStyle='#fff';x.beginPath();x.arc(s.x,s.y,s.r,0,7);x.fill()});x.globalAlpha=1;
const R=Math.min(W,H)*.07,mx=W*.82,my=H*.22+(RM?0:Math.sin(t/4000)*6);x.shadowColor='#fff8c8';x.shadowBlur=MOB?15:45;x.fillStyle='#f4f1d0';x.beginPath();x.arc(mx,my,R,0,7);x.fill();x.shadowBlur=0;x.fillStyle='#d8d3a8';[[-.3,-.2,.18],[.25,.1,.22],[-.1,.4,.12]].forEach(([a,bb,r])=>{x.beginPath();x.arc(mx+a*R,my+bb*R,r*R,0,7);x.fill()});
if(!RM&&!MOB){if(!ss&&Math.random()<.004)ss={x:Math.random()*W*.6,y:Math.random()*H*.3,l:0};if(ss){ss.l+=.03;const px=ss.x+ss.l*260,py=ss.y+ss.l*130;x.strokeStyle='#fff';x.globalAlpha=1-ss.l;x.lineWidth=2;x.beginPath();x.moveTo(px,py);x.lineTo(px-50,py-25);x.stroke();x.globalAlpha=1;if(ss.l>=1)ss=null}}}
const f=t=>{draw(t);id=(on||performance.now()<off)?requestAnimationFrame(f):0};
new IntersectionObserver(e=>{on=e[0].isIntersecting;c.classList.toggle('on',on);off=on?0:performance.now()+1800;if(RM){draw(0);return}if(!id)id=requestAnimationFrame(f)},{threshold:.25}).observe(sec)})();
// --- corrente sanguínea (fundo de #acao) ---
(()=>{const sec=$('#acao'),c=$('#bl'),x=c.getContext('2d');let W,H,mx=-999,my=-999,C=[],M=[];
function rs(){W=c.width=sec.clientWidth;H=c.height=sec.clientHeight;const n=MOB?12:34;C=[...Array(n)].map(()=>({x:Math.random()*W,y:Math.random()*H,r:10+Math.random()*8,v:.6+Math.random()*.8,ph:Math.random()*6}));M=[...Array(n)].map(()=>({x:Math.random()*W,y:Math.random()*H,r:3+Math.random()*2,v:1+Math.random(),ph:Math.random()*6,c:Math.random()<.5?'#ff3df0':'#20e0ff'}));if(RM)frame(0,16)}
const rep=o=>{const dx=o.x-mx,dy=o.y-my,d=Math.hypot(dx,dy);if(d<110&&d>0){o.x+=dx/d*(110-d)*.08;o.y+=dy/d*(110-d)*.08}};
function frame(t,dt){const k=Math.min(dt||16,50)/16;x.clearRect(0,0,W,H);
C.forEach(o=>{o.x+=o.v*k;o.y+=Math.sin(t/800+o.ph)*.25;rep(o);if(o.x>W+30)o.x=-30;x.save();x.translate(o.x,o.y);x.rotate(Math.sin(t/1500+o.ph)*.5);x.globalAlpha=.6;x.fillStyle='#c0283a';x.beginPath();x.ellipse(0,0,o.r,o.r*.7,0,0,7);x.fill();x.fillStyle='#7a1224';x.beginPath();x.ellipse(0,0,o.r*.45,o.r*.3,0,0,7);x.fill();x.restore()});
M.forEach(o=>{o.x+=o.v*1.4*k;o.y+=Math.cos(t/600+o.ph)*.4;rep(o);if(o.x>W+20)o.x=-20;x.globalAlpha=.9;x.fillStyle=o.c;x.beginPath();x.arc(o.x,o.y,o.r,0,7);x.fill();x.strokeStyle=o.c;x.globalAlpha=.4;x.beginPath();x.arc(o.x,o.y,o.r+3,0,7);x.stroke()});x.globalAlpha=1}
rs();addEventListener('resize',rs);if('ResizeObserver'in window)new ResizeObserver(()=>{if(Math.abs(sec.clientHeight-H)>4)rs()}).observe(sec);
sec.addEventListener('pointermove',e=>{const r=sec.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top});sec.addEventListener('pointerleave',()=>{mx=my=-999});
if(!RM)loopOn(sec,frame,.05)})();
// ===== acréscimos: cortisol, ciclo, microscópio, transições =====
// --- cortisol ---
(()=>{const sv=$('#cz'),l=$('#czl'),a=$('#cza'),d=$('#czd');const L=l.getTotalLength();l.style.strokeDasharray=L;let raf=0,seen=0;
function set(p){l.style.strokeDashoffset=L*(1-p);a.style.opacity=p*.9;const q=l.getPointAtLength(L*p);d.setAttribute('cx',q.x);d.setAttribute('cy',q.y);d.style.opacity=p>0?1:0}
function play(){cancelAnimationFrame(raf);if(RM){set(1);return}const t0=performance.now();set(0);const f=t=>{const p=Math.min(1,(t-t0)/3200);set(1-Math.pow(1-p,3));if(p<1)raf=requestAnimationFrame(f)};raf=requestAnimationFrame(f)}
set(RM?1:0);new IntersectionObserver(e=>{if(e[0].isIntersecting&&!seen){seen=1;play()}},{threshold:.4}).observe(sv);$('#czr').onclick=play})();
// --- ciclo menstrual ---
(()=>{const sv=$('#cy'),sx=d=>50+d/28*620,sy=v=>260-v*210;
const cr=pts=>{const P=pts.map(([d,v])=>[sx(d),sy(v)]);let s=`M${P[0][0]} ${P[0][1]}`;for(let i=0;i<P.length-1;i++){const p0=P[i-1]||P[i],p1=P[i],p2=P[i+1],p3=P[i+2]||p2;s+=`C${p1[0]+(p2[0]-p0[0])/6} ${p1[1]+(p2[1]-p0[1])/6} ${p2[0]-(p3[0]-p1[0])/6} ${p2[1]-(p3[1]-p1[1])/6} ${p2[0]} ${p2[1]}`}return s};
const B=[['Menstruação',0,5,'#ff3d6a'],['Fase folicular',5,13,'#20e0ff'],['Ovulação',13,15,'#ffb020'],['Fase lútea',15,28,'#ff3df0']];
const C=[['e','#ff3df0',[[0,.12],[3,.1],[7,.3],[11,.65],[13,.95],[14.5,.5],[18,.45],[21,.6],[24,.4],[27,.15],[28,.12]]],
['p','#ffb020',[[0,.08],[7,.06],[13,.08],[15,.25],[18,.6],[21,.95],[24,.7],[27,.15],[28,.1]]],
['lh','#20e0ff',[[0,.1],[8,.12],[12,.2],[12.8,.4],[13.5,1],[14.3,.4],[16,.14],[28,.1]]],
['fsh','#7aa2ff',[[0,.35],[4,.4],[8,.25],[12,.3],[13.5,.6],[15,.25],[20,.12],[26,.2],[28,.35]]]];
sv.innerHTML=B.map(([n,a,b,c])=>`<rect x="${sx(a)}" y="20" width="${sx(b)-sx(a)}" height="240" fill="${c}" opacity=".09"/><text x="${(sx(a)+sx(b))/2}" y="38" text-anchor="middle" font-size="10.5" fill="${c}">${n}</text>`).join('')
+`<path d="M50 20V260H670" fill="none" stroke="currentColor" stroke-opacity=".35"/><g fill="currentColor" font-size="11" text-anchor="middle">${[1,7,14,21,28].map(k=>`<text x="${sx(k-1)}" y="278">dia ${k}</text>`).join('')}<text x="360" y="296" font-size="10" fill-opacity=".7">dias do ciclo (exemplo) · altura = nível relativo</text></g>`
+C.map(([k,c,p])=>`<path class="l ${k}" pathLength="1" stroke="${c}" d="${cr(p)}"/>`).join('');
const T={all:'Todos juntos: o FSH estimula os folículos, o estrogênio sobe, o pico de LH desencadeia a ovulação e, depois, a progesterona domina a fase lútea.',e:'Estrogênio: cresce na fase folicular, atinge o pico perto da ovulação e tem um segundo aumento menor na fase lútea. Ajuda a espessar o endométrio.',p:'Progesterona: sobe após a ovulação (corpo lúteo) e prepara e mantém o endométrio. Se não há gravidez, cai e ocorre a menstruação.',lh:'LH: tem um pico (surto) pouco antes da ovulação, que desencadeia a liberação do óvulo.',fsh:'FSH: estimula o crescimento dos folículos no início do ciclo e tem um pequeno aumento junto com o LH no meio do ciclo.'};
const tx=$('#cyt');tx.textContent=T.all;
$('#cyb').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;document.querySelectorAll('#cyb button').forEach(x=>x.classList.remove('on'));b.classList.add('on');if(b.dataset.h=='all')delete sv.dataset.hl;else sv.dataset.hl=b.dataset.h;tx.textContent=T[b.dataset.h]});
if(RM)sv.classList.add('go');else new IntersectionObserver(e=>{if(e[0].isIntersecting)sv.classList.add('go')},{threshold:.35}).observe(sv)})();
// --- microscópio ---
(()=>{const ms=$('#ms'),lens=$('#lens'),mz=$('#mz'),low=$('#mlow'),Z=2.8;let W,H,r,cur='tir',px=0,py=0,raf=0,pend=null,ex=0,ey=0;
const rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const cap=(S,R,a,b,c,d,mx,my)=>{S.push({t:'p',k:'cap',d:`M${a} ${b}Q${mx} ${my} ${c} ${d}`});for(let i=1;i<7;i++){const u=i/7+(R()-.5)*.05,v=1-u;S.push({t:'e',k:'rbc',x:v*v*a+2*v*u*mx+u*u*c,y:v*v*b+2*v*u*my+u*u*d,rx:6,ry:3.5,rot:R()*180})}};
function data(k){const R=rng(k=='tir'?7:19),S=[];
if(k=='tir'){for(let i=0;i<70;i++)S.push({t:'c',k:'str',x:R()*800,y:R()*400,r:3+R()*5});
const F=[[150,110,58],[335,92,46],[520,140,64],[690,100,48],[240,295,54],[450,300,60],[650,290,50]];
cap(S,R,0,215,800,200,400,170);cap(S,R,300,0,420,400,370,200);
F.forEach(([x,y,rr])=>{const n=Math.round(rr/5);for(let i=0;i<n;i++){const a=i/n*6.283;S.push({t:'e',k:'cel',x:x+Math.cos(a)*(rr+7),y:y+Math.sin(a)*(rr+7),rx:10,ry:7,rot:a*57.3+90})}S.push({t:'c',k:'col',x,y,r:rr});for(let i=0;i<n;i++){const a=i/n*6.283;S.push({t:'c',k:'nuc',x:x+Math.cos(a)*(rr+8),y:y+Math.sin(a)*(rr+8),r:3.6})}})}
else{const ix=400,iy=200;for(let gx=0;gx<800;gx+=24)for(let gy=0;gy<400;gy+=24){const x=gx+R()*12,y=gy+R()*12;if(Math.hypot(x-ix,y-iy)>118){S.push({t:'c',k:'aci',x,y,r:9+R()*3});S.push({t:'c',k:'nuc2',x:x+2,y:y+2,r:3})}}
const P=[];let tries=0;while(P.length<48&&tries++<2000){const a=R()*6.283,d=Math.sqrt(R())*104,x=ix+Math.cos(a)*d,y=iy+Math.sin(a)*d;if(P.every(q=>Math.hypot(q[0]-x,q[1]-y)>15))P.push([x,y])}
cap(S,R,280,60,520,340,330,230);cap(S,R,290,330,520,70,420,190);
P.forEach(([x,y])=>{const q=R();S.push({t:'c',k:q<.68?'be':q<.9?'al':'de',x,y,r:8.5})})}
return S}
const CD={str:'#5a2f6a',cap:'#b52a3d',rbc:'#e8505f',cel:'#c777b5',col:'#f6cfe0',nuc:'#4b1b6d',aci:'#9a6fb0',nuc2:'#3d1558',be:'#ff3df0',al:'#20e0ff',de:'#ffb020'},CL={str:'#4a2a58',cap:'#7a2a44',cel:'#8b5a96',col:'#d9a8c6',aci:'#8a64a0',be:'#a0509a',al:'#a0509a',de:'#a0509a'};
const svg=(S,det)=>'<svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice"><rect width="800" height="400" fill="'+(det?'#3a1d4d':'#2a1740')+'"/>'+S.map(s=>{const c=det?CD[s.k]:CL[s.k];if(!c)return'';if(s.t=='c')return`<circle cx="${s.x|0}" cy="${s.y|0}" r="${s.r}" fill="${c}"${s.k=='str'?' opacity=".4"':''}/>`;if(s.t=='e')return`<ellipse cx="${s.x|0}" cy="${s.y|0}" rx="${s.rx}" ry="${s.ry}" fill="${c}" transform="rotate(${s.rot|0} ${s.x|0} ${s.y|0})"/>`;return`<path d="${s.d}" fill="none" stroke="${c}" stroke-width="${det?8:10}" stroke-linecap="round"/>`}).join('')+'</svg>';
const TX={tir:'Tireoide: folículos com colóide (reserva de hormônio tireoidiano) cercados por células foliculares. Os capilares vermelhos levam os hormônios ao sangue.',pan:'Ilhota pancreática: células beta (magenta, insulina, predominam), alfa (ciano, glucagon) e delta (âmbar, somatostatina). Ao redor, ácinos exócrinos (enzimas digestivas).'};
function render(){const S=data(cur);low.innerHTML=svg(S,0);mz.innerHTML=svg(S,1);$('#mst').textContent=TX[cur]}
function size(){W=ms.clientWidth;H=ms.clientHeight;r=W<560?58:85;lens.style.width=lens.style.height=2*r+'px';mz.style.width=W*Z+'px';mz.style.height=H*Z+'px';place(px||W/2,py||H/2)}
function place(x,y){px=Math.max(0,Math.min(W,x));py=Math.max(0,Math.min(H,y));lens.style.transform=`translate3d(${px-r}px,${py-r}px,0)`;mz.style.transform=`translate3d(${r-px*Z}px,${r-py*Z}px,0)`}
function mv(e){const b=ms.getBoundingClientRect();pend=[e.clientX-b.left,e.clientY-b.top-(e.pointerType=='touch'?r+16:0)];lens.classList.add('on');if(!raf)raf=requestAnimationFrame(()=>{raf=0;place(...pend)})}
ms.addEventListener('pointermove',mv);ms.addEventListener('pointerdown',mv);ms.addEventListener('pointerleave',e=>{if(e.pointerType=='mouse')lens.classList.remove('on')});
ms.addEventListener('keydown',e=>{const k={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]}[e.key];if(k){e.preventDefault();lens.classList.add('on');place(px+k[0],py+k[1])}});
$('#msb').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;document.querySelectorAll('#msb button').forEach(x=>x.classList.remove('on'));b.classList.add('on');cur=b.dataset.s;render()});
render();size();addEventListener('resize',size);new IntersectionObserver(e=>{if(e[0].isIntersecting&&!pend)lens.classList.add('on')},{threshold:.4}).observe(ms)})();
// --- transições estilo documentário (ligadas à rolagem, sem prender a página) ---
(()=>{if(RM)return;const BL='M200 40c42-8 92 22 108 62s-14 88-62 98-112-14-122-62 34-90 76-98z';
const V=['<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice"><g class="ga"><path class="r r1" d="'+BL+'"/><path class="r r2" d="'+BL+'"/><path class="r r3" d="'+BL+'"/><circle class="nu" cx="200" cy="100" r="9"/></g></svg>',
'<svg class="cl" viewBox="0 0 100 200" preserveAspectRatio="none"><path d="M0 0H86c-16 22 14 44 0 66s16 44 0 66-14 40 0 68H0z" fill="#0b1445" stroke="#20e0ff" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><svg class="cr" viewBox="0 0 100 200" preserveAspectRatio="none"><path d="M100 0H14c16 22-14 44 0 66s-16 44 0 66 14 40 0 68h86z" fill="#0b1445" stroke="#20e0ff" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>',
'<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice"><g class="gc"><path class="bd" d="M200 66c-30 0-52 14-56 40l-6 90h124l-6-90c-4-26-26-40-56-40z"/><circle cx="200" cy="30" r="17" class="bd"/><circle cx="200" cy="110" r="3"/></g></svg>'];
const act=new Set();let raf=0;const sched=()=>{if(!raf)raf=requestAnimationFrame(upd)};const io2=new IntersectionObserver(es=>{es.forEach(e=>e.isIntersecting?act.add(e.target):act.delete(e.target));sched()},{rootMargin:'10% 0px'});
['modelo','acao','glicemia','microscopio','doencas','estresse','ciclo','jogo'].forEach((id,i)=>{const s=document.getElementById(id);if(!s)return;const d=document.createElement('div');d.className='dv v'+i%3;d.setAttribute('aria-hidden','true');d.innerHTML=V[i%3];s.parentNode.insertBefore(d,s);io2.observe(d)});
function upd(){raf=0;act.forEach(d=>{const r=d.getBoundingClientRect(),p=Math.max(0,Math.min(1,(innerHeight-r.top)/(innerHeight+r.height)));d.style.setProperty('--p',p.toFixed(3));d.style.setProperty('--g',Math.abs(2*p-1).toFixed(3))})}
addEventListener('scroll',sched,{passive:true});addEventListener('resize',sched)})();


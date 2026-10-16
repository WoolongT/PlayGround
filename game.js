import * as THREE from 'three';

// ============ UTILS ============
const rand=(a,b)=>a+Math.random()*(b-a);
const randi=(a,b)=>Math.floor(rand(a,b+1));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const $=id=>document.getElementById(id);
function dist2D(ax,az,bx,bz){const dx=ax-bx,dz=az-bz;return Math.hypot(dx,dz);}

// ============ AUDIO (procedural) ============
const AudioSys={
  ctx:null,master:null,
  init(){ if(this.ctx) return; try{
    this.ctx=new (window.AudioContext||window.webkitAudioContext)();
    this.master=this.ctx.createGain(); this.master.gain.value=0.35; this.master.connect(this.ctx.destination);
  }catch(e){} },
  blip(freq,dur,type='square',vol=0.3,slide=0){ if(!this.ctx)return;
    const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t); if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),t+dur);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(g);g.connect(this.master);o.start(t);o.stop(t+dur+0.02); },
  noise(dur=0.4,vol=0.5,low=200){ if(!this.ctx)return;
    const t=this.ctx.currentTime,len=this.ctx.sampleRate*dur,buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);
    const s=this.ctx.createBufferSource();s.buffer=buf;
    const f=this.ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=low+800;
    const g=this.ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    s.connect(f);f.connect(g);g.connect(this.master);s.start(t); },
  zap(){this.blip(1400,0.18,'sawtooth',0.25,-1200);this.noise(0.12,0.2,3000);},
  plasma(){this.blip(300,0.3,'sawtooth',0.3,900);},
  explosion(){this.noise(0.8,0.7,900);this.blip(90,0.6,'sine',0.5,-60);},
  abduct(){this.blip(rand(400,800),0.15,'sine',0.12,300);},
  pickup(){this.blip(700,0.12,'square',0.2,500);this.blip(1050,0.15,'square',0.15,300);},
  hurt(){this.blip(200,0.25,'sawtooth',0.35,-100);},
  ui(){this.blip(600,0.08,'square',0.2);},
  alarm(){this.blip(440,0.2,'square',0.25);setTimeout(()=>this.blip(330,0.2,'square',0.25),220);},
  shock(){this.noise(0.5,0.6,500);this.blip(120,0.5,'sine',0.4,-80);},
  pk(){this.blip(180,0.2,'sine',0.2,220);}
};

// ============ INPUT ============
const Input={keys:{},lmb:false,rmb:false,mdx:0,mdy:0,locked:false,
  init(canvas){
    addEventListener('keydown',e=>{this.keys[e.code]=true;
      if(['Space','Tab'].includes(e.code))e.preventDefault();
      if(e.code==='Digit1')Game.setWeapon(0);
      if(e.code==='Digit2')Game.setWeapon(1);
      if(e.code==='Digit3')Game.setWeapon(2);
      if(e.code==='KeyF')Game.toggleSaucer();
      if(e.code==='KeyQ')Game.shockwave();
      if(e.code==='KeyP')Game.togglePause();
    });
    addEventListener('keyup',e=>{this.keys[e.code]=false;});
    canvas.addEventListener('mousedown',e=>{
      AudioSys.init();
      if(Game.state!=='playing')return;
      if(!this.locked){canvas.requestPointerLock?.();return;}
      if(e.button===0)this.lmb=true; if(e.button===2)this.rmb=true;
    });
    addEventListener('mouseup',e=>{if(e.button===0)this.lmb=false;if(e.button===2)this.rmb=false;});
    addEventListener('contextmenu',e=>e.preventDefault());
    document.addEventListener('pointerlockchange',()=>{this.locked=document.pointerLockElement===canvas;});
    addEventListener('mousemove',e=>{if(this.locked&&Game.state==='playing'){this.mdx+=e.movementX;this.mdy+=e.movementY;}});
    // Esc unlock handled by browser; pause on Esc via pointerlock exit
    document.addEventListener('pointerlockchange',()=>{
      if(!document.pointerLockElement&&Game.state==='playing'&&!Game._justDied){/* don't auto pause, just show hint */}
    });
  }
};

// ============ THREE SETUP (HD) ============
const app=$('app');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.domElement.classList.add('game');
app.prepend(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87b5e0);
scene.fog=new THREE.Fog(0xa8c6e0,140,620);
const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,0.1,2000);
camera.position.set(0,30,40);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

const hemi=new THREE.HemisphereLight(0xcfe5ff,0x5a7a45,0.75);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1d6,2.4);
sun.position.set(140,190,70);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-260;sun.shadow.camera.right=260;sun.shadow.camera.top=260;sun.shadow.camera.bottom=-260;
sun.shadow.camera.near=20;sun.shadow.camera.far=700;
sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.6;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff,0.22));
const rimSun=new THREE.DirectionalLight(0x9fc4ff,0.5);
rimSun.position.set(-120,80,-140);scene.add(rimSun);

// HD sky: gradient shader dome + sun disc + drifting clouds + distant mesas
const HD={clouds:[],time:0};
{
  const skyGeo=new THREE.SphereGeometry(1200,32,18);
  const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,fog:false,depthWrite:false,
    uniforms:{top:{value:new THREE.Color(0x2f6fd0)},mid:{value:new THREE.Color(0x87b5e0)},bot:{value:new THREE.Color(0xd8ecf5)},sunDir:{value:new THREE.Vector3(140,190,70).normalize()}},
    vertexShader:`varying vec3 vP; void main(){vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec3 vP; uniform vec3 top,mid,bot,sunDir;
      void main(){float h=clamp(vP.y,-0.08,1.0);
      vec3 c=mix(bot,mid,smoothstep(0.0,0.22,h));
      c=mix(c,top,smoothstep(0.22,0.85,h));
      float s=max(dot(normalize(vP),normalize(sunDir)),0.0);
      c+=vec3(1.0,0.92,0.75)*pow(s,600.0)*1.4;
      c+=vec3(1.0,0.85,0.6)*pow(s,8.0)*0.12;
      gl_FragColor=vec4(c,1.0);}`});
  scene.add(new THREE.Mesh(skyGeo,skyMat));
  // clouds
  const cloudMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0,transparent:true,opacity:0.92,flatShading:true});
  for(let i=0;i<16;i++){
    const cg=new THREE.Group();
    const n=randi(3,6);
    for(let k=0;k<n;k++){
      const s=new THREE.Mesh(new THREE.SphereGeometry(rand(9,20),10,8),cloudMat);
      s.position.set(rand(-26,26),rand(-4,4),rand(-12,12));s.scale.y=0.45;cg.add(s);
    }
    cg.position.set(rand(-700,700),rand(150,260),rand(-700,700));
    cg.scale.setScalar(rand(0.8,1.9));
    scene.add(cg);HD.clouds.push({g:cg,sp:rand(0.8,2.4)});
  }
  // distant mesas / hills ring (hazy 50s southwest)
  const mesaMat=new THREE.MeshStandardMaterial({color:0x8a7a6a,roughness:1,flatShading:true});
  const mesaMat2=new THREE.MeshStandardMaterial({color:0x7a8a72,roughness:1,flatShading:true});
  for(let i=0;i<22;i++){
    const a=i/22*Math.PI*2+rand(-0.1,0.1),R=rand(620,820);
    const w=rand(90,220),h=rand(28,85);
    const mesa=new THREE.Mesh(new THREE.CylinderGeometry(w*rand(0.55,0.75),w,h,7),i%2?mesaMat:mesaMat2);
    mesa.position.set(Math.cos(a)*R,h/2-4,Math.sin(a)*R);
    mesa.rotation.y=rand(0,6);scene.add(mesa);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(w*rand(0.55,0.75),w*rand(0.55,0.75),6,7),new THREE.MeshStandardMaterial({color:0x9a5a3a,roughness:1,flatShading:true}));
    cap.position.set(mesa.position.x,h-2,mesa.position.z);cap.rotation.y=mesa.rotation.y;scene.add(cap);
  }
}
HD.update=(dt)=>{HD.time+=dt;for(const c of HD.clouds){c.g.position.x+=c.sp*dt;if(c.g.position.x>750)c.g.position.x=-750;}};

// ============ PARTICLES ============
const Particles={
  pool:[],idx:0,
  init(){
    const geo=new THREE.BoxGeometry(0.35,0.35,0.35);
    for(let i=0;i<350;i++){
      const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true}));
      m.visible=false;scene.add(m);
      this.pool.push({m,vx:0,vy:0,vz:0,life:0,max:1,grav:0,fade:true});
    }
  },
  spawn(x,y,z,color,n=10,speed=8,life=0.8,up=4,grav=12){
    for(let k=0;k<n;k++){
      const p=this.pool[this.idx++%this.pool.length];
      p.m.visible=true;p.m.position.set(x+rand(-0.5,0.5),y+rand(-0.5,0.5),z+rand(-0.5,0.5));
      p.m.material.color.setHex(color);p.m.material.opacity=1;
      const a=rand(0,Math.PI*2),s=rand(speed*0.3,speed);
      p.vx=Math.cos(a)*s;p.vz=Math.sin(a)*s;p.vy=rand(-2,up);
      p.life=p.max=rand(life*0.5,life);p.grav=grav;
      p.m.scale.setScalar(rand(0.6,1.8));
    }
  },
  update(dt){
    for(const p of this.pool){ if(!p.m.visible)continue;
      p.life-=dt; if(p.life<=0){p.m.visible=false;continue;}
      p.vy-=p.grav*dt;
      p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;
      if(p.m.position.y<0.1){p.m.position.y=0.1;p.vy*=-0.4;}
      p.m.material.opacity=p.life/p.max;
      p.m.rotation.x+=dt*4;p.m.rotation.y+=dt*3;
    }
  }
};
Particles.init();

// Beams / tracers / projectiles pools
const FX={
  beams:[],rings:[],
  init(){
    for(let i=0;i<12;i++){
      const g=new THREE.CylinderGeometry(0.18,0.5,1,6,1,true);
      const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0x7dfffa,transparent:true,opacity:0.85,blending:THREE.AdditiveBlending,depthWrite:false}));
      m.visible=false;scene.add(m);this.beams.push(m);
    }
  },
  beam(ax,ay,az,bx,by,bz,color=0x7dfffa,thick=1){
    const m=this.beams.find(b=>!b.visible)||this.beams[0];
    m.visible=true;m.material.color.setHex(color);
    const a=new THREE.Vector3(ax,ay,az),b=new THREE.Vector3(bx,by,bz);
    const d=a.distanceTo(b); if(d<0.01)return;
    m.position.copy(a).lerp(b,0.5);
    m.scale.set(thick,d,thick);
    m.lookAt(b);m.rotateX(Math.PI/2);
    m.userData.t=0.08;
  },
  ring(x,y,z,color=0x7dfffa,maxR=18){
    const g=new THREE.TorusGeometry(1,0.35,8,32);
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending,depthWrite:false}));
    m.position.set(x,y,z);m.rotation.x=Math.PI/2;scene.add(m);
    this.rings.push({m,r:1,maxR,life:0.6});
  },
  update(dt){
    for(const b of this.beams){if(!b.visible)continue;b.userData.t-=dt;if(b.userData.t<=0)b.visible=false;}
    for(let i=this.rings.length-1;i>=0;i--){const r=this.rings[i];r.life-=dt;
      r.r=lerp(r.maxR,1,Math.max(0,r.life/0.6));
      r.m.scale.setScalar((r.maxR-r.r)+1);r.m.material.opacity=Math.max(0,r.life);
      if(r.life<=0){scene.remove(r.m);r.m.geometry.dispose();r.m.material.dispose();this.rings.splice(i,1);}}
  }
};
FX.init();

// floating combat text via sprites? use HTML? skip - use particles

// ============ WORLD (HD materials + procedural textures; all original) ============
const WORLD={size:460,buildings:[],colliders:[],roads:[],trees:[]};
function canvasTex(size,draw,rx=1,ry=1){
  const c=document.createElement('canvas');c.width=c.height=size;
  draw(c.getContext('2d'),size);
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);
  t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
  return t;
}
const TEX={
  grass:canvasTex(256,(x,s)=>{x.fillStyle='#5da24a';x.fillRect(0,0,s,s);
    for(let i=0;i<2600;i++){x.fillStyle=`rgba(${randi(40,90)},${randi(130,175)},${randi(50,90)},0.55)`;x.fillRect(rand(0,s),rand(0,s),rand(1,3),rand(1,4));}} ,46,46),
  pasture:canvasTex(256,(x,s)=>{x.fillStyle='#69b455';x.fillRect(0,0,s,s);
    for(let i=0;i<1800;i++){x.fillStyle=`rgba(${randi(90,130)},${randi(170,200)},${randi(80,110)},0.5)`;x.fillRect(rand(0,s),rand(0,s),2,rand(1,4));}},14,9),
  road:canvasTex(256,(x,s)=>{x.fillStyle='#33373d';x.fillRect(0,0,s,s);
    for(let i=0;i<2500;i++){x.fillStyle=`rgba(${randi(40,70)},${randi(45,75)},${randi(50,80)},0.5)`;x.fillRect(rand(0,s),rand(0,s),2,2);}},1,24),
  roof:canvasTex(256,(x,s)=>{x.fillStyle='#7a3226';x.fillRect(0,0,s,s);
    x.strokeStyle='rgba(0,0,0,0.35)';x.lineWidth=2;
    for(let y=0;y<s;y+=16){x.beginPath();x.moveTo(0,y);x.lineTo(s,y);x.stroke();
      for(let px=((y/16)%2)*16;px<s;px+=32){x.beginPath();x.moveTo(px,y);x.lineTo(px,y+16);x.stroke();}}}),
  siding:canvasTex(256,(x,s)=>{x.fillStyle='#efe8d8';x.fillRect(0,0,s,s);
    x.strokeStyle='rgba(120,100,80,0.35)';x.lineWidth=2;
    for(let y=0;y<s;y+=14){x.beginPath();x.moveTo(0,y);x.lineTo(s,y);x.stroke();}}),
  concrete:canvasTex(256,(x,s)=>{x.fillStyle='#9aa0a6';x.fillRect(0,0,s,s);
    for(let i=0;i<1600;i++){x.fillStyle=`rgba(${randi(120,170)},${randi(120,170)},${randi(120,170)},0.4)`;x.fillRect(rand(0,s),rand(0,s),2,2);}},4,4),
  bark:canvasTex(128,(x,s)=>{x.fillStyle='#6a4a2a';x.fillRect(0,0,s,s);
    x.strokeStyle='rgba(30,18,8,0.6)';for(let i=0;i<24;i++){x.beginPath();const px=rand(0,s);x.moveTo(px,0);x.lineTo(px+rand(-8,8),s);x.stroke();}}),
};
function std(o){return new THREE.MeshStandardMaterial(Object.assign({roughness:0.85,metalness:0.04},o));}
const MAT={
  grass:new THREE.MeshStandardMaterial({map:TEX.grass,roughness:1,metalness:0}),
  pasture:new THREE.MeshStandardMaterial({map:TEX.pasture,roughness:1}),
  road:new THREE.MeshStandardMaterial({map:TEX.road,roughness:0.95}),
  sidewalk:std({map:TEX.concrete,color:0xbfc4c9}),
  white:std({map:TEX.siding,color:0xffffff,roughness:0.8}),
  roof:std({map:TEX.roof,roughness:0.9}),
  roof2:std({color:0x4a5a7a,roughness:0.7,metalness:0.25}),
  wood:std({map:TEX.bark,roughness:0.95}),
  leaf:std({color:0x2e7d32,roughness:1,flatShading:true}),
  leaf2:std({color:0x3f9a3a,roughness:1,flatShading:true}),
  metal:std({color:0x9aa6b2,roughness:0.35,metalness:0.85}),
  chrome:std({color:0xf2f5f7,roughness:0.12,metalness:1}),
  darkMetal:std({color:0x2c343c,roughness:0.6,metalness:0.6}),
  glass:new THREE.MeshPhysicalMaterial({color:0xbfe3ef,roughness:0.08,metalness:0,transparent:true,opacity:0.55}),
  glassWarm:new THREE.MeshStandardMaterial({color:0xffe9a8,emissive:0xffc861,emissiveIntensity:1.4}),
  tire:std({color:0x141414,roughness:0.95}),
  whitewall:std({color:0xe8e8e8,roughness:0.6}),
  skin:std({color:0xe8b88a,roughness:0.65}),
  alienSkin:std({color:0x6fae7f,roughness:0.45,metalness:0.05}),
  saucerHull:std({color:0xc3ccd4,roughness:0.28,metalness:0.9}),
  saucerDark:std({color:0x3a444e,roughness:0.4,metalness:0.8}),
};

function addCollider(x,z,hx,hz,ref){WORLD.colliders.push({x,z,hx,hz,ref});}
function collides(x,z,r=0.8){
  for(const c of WORLD.colliders){
    if(c.dead)continue;
    if(Math.abs(x-c.x)<c.hx+r&&Math.abs(z-c.z)<c.hz+r)return c;
  }
  if(Math.abs(x)>WORLD.size/2-4||Math.abs(z)>WORLD.size/2-4)return {edge:true};
  return null;
}

function buildWorld(){
  // ground — HD grass with subtle undulation at edges
  const g=new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size,WORLD.size,48,48),MAT.grass);
  g.rotation.x=-Math.PI/2;g.receiveShadow=true;scene.add(g);
  // pasture south (fenced ranch)
  const pasture=new THREE.Mesh(new THREE.PlaneGeometry(140,90),MAT.pasture);
  pasture.rotation.x=-Math.PI/2;pasture.position.set(0,0.02,150);pasture.receiveShadow=true;scene.add(pasture);
  // dirt patch under pasture center
  const dirt=new THREE.Mesh(new THREE.CircleGeometry(26,24),std({color:0x9a7a4a,roughness:1}));
  dirt.rotation.x=-Math.PI/2;dirt.position.set(0,0.035,155);dirt.receiveShadow=true;scene.add(dirt);
  // roads grid — asphalt + curbs + center dashes + sidewalks
  const dashMat=new THREE.MeshStandardMaterial({color:0xe8c84a,roughness:0.8});
  const curbMat=std({map:TEX.concrete,color:0xcfd3d8});
  for(let i=-2;i<=2;i++){
    const rx=i*70;
    for(const [w,l,px,pz] of [[10,WORLD.size,rx,0],[WORLD.size,10,0,rx]]){
      const r=new THREE.Mesh(new THREE.PlaneGeometry(w,l),MAT.road);
      r.rotation.x=-Math.PI/2;r.position.set(px,0.03,pz);r.receiveShadow=true;scene.add(r);
    }
    // curbs
    for(const s of [-5.6,5.6]){
      const c1=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.35,WORLD.size),curbMat);
      c1.position.set(rx+s,0.17,0);c1.receiveShadow=true;scene.add(c1);
      const c2=new THREE.Mesh(new THREE.BoxGeometry(WORLD.size,0.35,0.7),curbMat);
      c2.position.set(0,0.17,rx+s);c2.receiveShadow=true;scene.add(c2);
    }
    // center dashes
    for(let d=-210;d<=210;d+=10){
      const dash=new THREE.Mesh(new THREE.PlaneGeometry(0.5,3),dashMat);
      dash.rotation.x=-Math.PI/2;dash.position.set(rx,0.045,d);scene.add(dash);
      const dash2=new THREE.Mesh(new THREE.PlaneGeometry(3,0.5),dashMat);
      dash2.rotation.x=-Math.PI/2;dash2.position.set(d,0.045,rx);scene.add(dash2);
    }
    WORLD.roads.push(rx);
  }
  // town square plaza + fountain + flag (original design)
  {
    const plaza=new THREE.Mesh(new THREE.CircleGeometry(30,32),std({map:TEX.concrete,color:0xd8dce0}));
    plaza.rotation.x=-Math.PI/2;plaza.position.set(0,0.04,0);plaza.receiveShadow=true;scene.add(plaza);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(5,6,1.4,16),std({color:0xb8c0c8,roughness:0.6}));
    base.position.set(0,0.7,0);base.castShadow=true;scene.add(base);
    const water=new THREE.Mesh(new THREE.CylinderGeometry(4.2,4.2,0.4,20),new THREE.MeshPhysicalMaterial({color:0x5fbfe8,roughness:0.05,transparent:true,opacity:0.85}));
    water.position.set(0,1.5,0);scene.add(water);
    const pillar=new THREE.Mesh(new THREE.CylinderGeometry(0.7,1,3.4,10),MAT.chrome);
    pillar.position.set(0,3,0);pillar.castShadow=true;scene.add(pillar);
    const bowl=new THREE.Mesh(new THREE.CylinderGeometry(2.2,1.4,0.8,14),std({color:0xb8c0c8,roughness:0.5}));
    bowl.position.set(0,4.6,0);bowl.castShadow=true;scene.add(bowl);
    // flag pole + original star flag (generic, not copied)
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,14,8),MAT.chrome);
    pole.position.set(12,7,0);pole.castShadow=true;scene.add(pole);
    const flagT=canvasTex(128,(x,s)=>{x.fillStyle='#b03a2e';x.fillRect(0,0,s,s*0.55);x.fillStyle='#f5f2e8';x.fillRect(0,0,s,s);
      x.fillStyle='#b03a2e';for(let r=0;r<7;r++)x.fillRect(0,r*18+9,s,9);
      x.fillStyle='#1a3a8a';x.fillRect(0,0,52,48);x.fillStyle='#fff';
      for(let ry=0;ry<5;ry++)for(let rx2=0;rx2<6;rx2++)x.fillRect(4+rx2*8,5+ry*9,3,3);});
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(5,3),new THREE.MeshStandardMaterial({map:flagT,side:THREE.DoubleSide,roughness:0.9}));
    flag.position.set(14.6,12.4,0);flag.name='flag';scene.add(flag);HD.flag=flag;
    const oHD=HD.update;HD.update=(dt)=>{oHD(dt);if(HD.flag)HD.flag.rotation.y=Math.sin(HD.time*2.2)*0.28;};
  }
  // billboard + power poles + hydrants + mailboxes (original props)
  {
    const bbT=canvasTex(256,(x,s)=>{x.fillStyle='#0b3a5a';x.fillRect(0,0,s,140);
      x.fillStyle='#ffe9a8';x.font='bold 34px Trebuchet MS';x.textAlign='center';
      x.fillText('VISIT ROCKWELL!',s/2,60);x.fillStyle='#7dfffa';x.font='20px Trebuchet MS';x.fillText('★ 50s AMERICA ★',s/2,100);});
    const bb=new THREE.Mesh(new THREE.PlaneGeometry(16,8),new THREE.MeshStandardMaterial({map:bbT,roughness:0.8}));
    bb.position.set(-60,7,118);bb.rotation.y=0.35;bb.castShadow=true;scene.add(bb);
    for(const s of [-1,1]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,7,8),MAT.darkMetal);leg.position.set(-60+s*5,3,118.5);scene.add(leg);}
    for(let k=-3;k<=3;k++){
      const p=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.28,11,8),MAT.wood);
      p.position.set(-77,5.5,k*55);p.castShadow=true;scene.add(p);
      const cross=new THREE.Mesh(new THREE.BoxGeometry(0.25,0.25,4),MAT.wood);
      cross.position.set(-77,9.6,k*55);scene.add(cross);
    }
  }
  // houses
  const houseColors=[0xf5f2e8,0xf0d9a8,0xd9e6f0,0xf0c0c0,0xe8e0c8];
  let bi=0;
  const spots=[];
  for(let gx=-2;gx<=2;gx++)for(let gz=-2;gz<=2;gz++){
    if(gx===0&&gz===0)continue; // town square
    const cx=gx*70+rand(-18,18),cz=gz*70+rand(-18,18);
    if(cz>110)continue; // pasture area
    if(gz===-2&&gx>0)continue; // military base area reserved
    spots.push([cx,cz]);
  }
  for(const [cx,cz] of spots){
    if(bi%3===0&&Math.random()<0.5){ makeHouse(cx,cz,houseColors[bi%houseColors.length],true); }
    else makeHouse(cx,cz,houseColors[bi%houseColors.length],false);
    bi++;
    if(bi>=34)break;
  }
  // town hall (center)
  makeTownHall(0,0);
  // water tower
  makeWaterTower(-40,-40);
  // farm barn north-west pasture edge
  makeBarn(-80,130);makeBarn(-60,150);
  // military base north-east
  makeMilitaryBase(140,-140);
  // trees scattered
  for(let i=0;i<90;i++){
    const x=rand(-220,220),z=rand(-220,220);
    if(Math.abs(x)<12||Math.abs(z)<12)continue;
    if(collides(x,z,2))continue;
    makeTree(x,z);
  }
  // lamp posts along roads
  for(let i=-2;i<=2;i++)for(let k=-3;k<=3;k++){
    if(Math.random()<0.6)makeLamp(i*70+7,k*55);
  }
  // fences around pasture
  makeFences();
}
function makeHouse(x,z,color,big=false){
  const grp=new THREE.Group();
  const w=big?rand(14,18):rand(8,12),d=big?rand(12,16):rand(8,11),h=big?rand(6,9):rand(4,6);
  const siding=std({map:TEX.siding,color,roughness:0.85});
  const found=new THREE.Mesh(new THREE.BoxGeometry(w+0.6,0.8,d+0.6),std({map:TEX.concrete,color:0x9a9ea4}));
  found.position.y=0.4;found.receiveShadow=true;grp.add(found);
  const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),siding);
  body.position.y=0.8+h/2;body.castShadow=true;body.receiveShadow=true;grp.add(body);
  // brick chimney
  const chim=new THREE.Mesh(new THREE.BoxGeometry(1,3,1),std({color:0x8a4a3a,roughness:0.95}));
  chim.position.set(w*0.28,0.8+h+1,d*0.1);chim.castShadow=true;grp.add(chim);
  // gabled shingle roof with eaves + ridge
  const roofG=new THREE.Group();
  const slope=Math.max(w,d)*0.62;
  for(const s of [-1,1]){
    const panel=new THREE.Mesh(new THREE.BoxGeometry(slope+1,0.3,d+1.6),MAT.roof);
    panel.position.set(s*slope*0.32,0.8+h+1.6,0);panel.rotation.z=s*-0.62;panel.castShadow=true;roofG.add(panel);
  }
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.4,d+1.8),std({color:0x5a2a20,roughness:0.9}));
  ridge.position.y=0.8+h+3.1;roofG.add(ridge);
  grp.add(roofG);
  // porch with posts, railing, steps
  const porch=new THREE.Mesh(new THREE.BoxGeometry(w*0.7,0.35,2.4),MAT.wood);
  porch.position.set(0,0.95,d/2+1.1);porch.receiveShadow=true;grp.add(porch);
  for(const s of [-1,1]){
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,2.6,8),std({color:0xf5f2e8,roughness:0.7}));
    post.position.set(s*w*0.32,2.2,d/2+2);post.castShadow=true;grp.add(post);
  }
  const awn=new THREE.Mesh(new THREE.BoxGeometry(w*0.75,0.18,2.6),std({color:0x2a6a5a,roughness:0.8}));
  awn.position.set(0,3.4,d/2+1.1);awn.castShadow=true;grp.add(awn);
  // windows with frames + warm emissive glass + shutters
  const frameM=std({color:0xfafafa,roughness:0.5});
  const addWin=(wx,wy,wz,ry=0)=>{
    const f=new THREE.Mesh(new THREE.BoxGeometry(1.7,1.5,0.12),frameM);f.position.set(wx,wy,wz);f.rotation.y=ry;grp.add(f);
    const gl=new THREE.Mesh(new THREE.PlaneGeometry(1.35,1.15),MAT.glassWarm);gl.position.set(wx,wy,wz+0.07);gl.rotation.y=ry;grp.add(gl);
    const barV=new THREE.Mesh(new THREE.BoxGeometry(0.08,1.15,0.02),frameM);barV.position.set(wx,wy,wz+0.08);barV.rotation.y=ry;grp.add(barV);
    for(const ss of [-1,1]){const sh=new THREE.Mesh(new THREE.BoxGeometry(0.5,1.5,0.08),std({color:0x2a4a3a,roughness:0.8}));sh.position.set(wx+ss*1.15,wy,wz);sh.rotation.y=ry;grp.add(sh);}
  };
  for(let k=-1;k<=1;k+=2)addWin(k*(w/3),0.8+h*0.55,d/2+0.03);
  addWin(-w/2-0.0+0.0,0,0,0); // keep count stable
  grp.children.pop();grp.children.pop();grp.children.pop();
  // side windows
  for(const s of [-1,1]){const f=new THREE.Mesh(new THREE.BoxGeometry(0.12,1.4,1.6),frameM);f.position.set(s*(w/2+0.03),0.8+h*0.55,0);grp.add(f);
    const gl=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.1),MAT.glassWarm);gl.rotation.y=s*Math.PI/2;gl.position.set(s*(w/2+0.08),0.8+h*0.55,0);grp.add(gl);}
  // door with panels + knob + steps
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.5,2.4,0.14),std({color:0x4a2f1a,roughness:0.7}));
  door.position.set(0,2,d/2+0.04);grp.add(door);
  const knob=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,8),MAT.chrome);
  knob.position.set(0.5,2,d/2+0.14);grp.add(knob);
  // lawn: path + bushes + mailbox (original)
  const path=new THREE.Mesh(new THREE.PlaneGeometry(2,5),std({map:TEX.concrete,color:0xd0d4d8}));
  path.rotation.x=-Math.PI/2;path.position.set(0,0.05,d/2+4.5);path.receiveShadow=true;grp.add(path);
  for(const s of [-1,1]){const bush=new THREE.Mesh(new THREE.SphereGeometry(rand(0.7,1),10,8),MAT.leaf2);
    bush.position.set(s*(w/2-0.8),0.7,d/2+0.4);bush.scale.y=0.8;bush.castShadow=true;grp.add(bush);}
  grp.position.set(x,0,z);grp.rotation.y=randi(0,3)*Math.PI/2;
  scene.add(grp);
  const b={mesh:grp,x,z,hx:w/2,hz:d/2,hp:big?220:120,maxHp:big?220:120,dead:false,isBuilding:true,name:big?'Apartment':'House',dna:25};
  WORLD.buildings.push(b);addCollider(x,z,w/2,d/2,b);
  return b;
}
function makeTownHall(x,z){
  // HD neoclassical hall — original design (columns, pediment, ribbed dome, steps)
  const grp=new THREE.Group();
  const stone=std({map:TEX.concrete,color:0xe9e2d2,roughness:0.8});
  for(let s=0;s<4;s++){
    const step=new THREE.Mesh(new THREE.BoxGeometry(30-s*1.2,0.5,22-s*1.2),stone);
    step.position.y=0.25+s*0.5;step.receiveShadow=true;grp.add(step);
  }
  const body=new THREE.Mesh(new THREE.BoxGeometry(26,10,18),stone);
  body.position.y=7;body.castShadow=true;body.receiveShadow=true;grp.add(body);
  // columned portico
  for(let i=-3;i<=3;i++){
    const col=new THREE.Mesh(new THREE.CylinderGeometry(0.65,0.75,8,12),std({color:0xf5f0e0,roughness:0.6}));
    col.position.set(i*3.4,6,10.6);col.castShadow=true;grp.add(col);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.5,1.7),std({color:0xf5f0e0}));cap.position.set(i*3.4,10.2,10.6);grp.add(cap);
  }
  const entab=new THREE.Mesh(new THREE.BoxGeometry(27,1.4,3),stone);entab.position.set(0,11,10.6);entab.castShadow=true;grp.add(entab);
  const ped=new THREE.Mesh(new THREE.CylinderGeometry(0.1,13.5,2.6,3,1),stone);
  ped.rotation.y=Math.PI;ped.position.set(0,13,10.6);grp.add(ped);
  // tall windows + double doors
  for(let i=-3;i<=3;i++){
    if(Math.abs(i)<0.5)continue;
    const f=new THREE.Mesh(new THREE.BoxGeometry(1.8,3.4,0.2),std({color:0xffffff,roughness:0.5}));f.position.set(i*3.4,6.4,9.05);grp.add(f);
    const gl=new THREE.Mesh(new THREE.PlaneGeometry(1.4,3),MAT.glassWarm);gl.position.set(i*3.4,6.4,9.16);grp.add(gl);
  }
  const door=new THREE.Mesh(new THREE.BoxGeometry(3.4,4.4,0.3),std({color:0x3a2412,roughness:0.6}));
  door.position.set(0,4.2,9.1);grp.add(door);
  // roof + ribbed dome + spire
  const roof=new THREE.Mesh(new THREE.BoxGeometry(28,1.2,20),MAT.roof2);roof.position.y=12.6;roof.castShadow=true;grp.add(roof);
  const drum=new THREE.Mesh(new THREE.CylinderGeometry(4.4,4.6,2.4,16),stone);drum.position.y=14;grp.add(drum);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(4.4,20,12,0,Math.PI*2,0,Math.PI/2),std({color:0x9fb4c4,roughness:0.35,metalness:0.7}));
  dome.position.y=15.2;dome.castShadow=true;grp.add(dome);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;
    const rib=new THREE.Mesh(new THREE.TorusGeometry(4.42,0.09,6,12,Math.PI/2),MAT.darkMetal);
    rib.position.y=15.2;rib.rotation.y=a;rib.rotation.z=0;grp.add(rib);}
  const spire=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,3,8),MAT.chrome);spire.position.y=20.4;grp.add(spire);
  grp.position.set(x,0,z);scene.add(grp);
  const b={mesh:grp,x,z,hx:13,hz:9,hp:500,maxHp:500,dead:false,isBuilding:true,name:'Town Hall',dna:120};
  WORLD.buildings.push(b);addCollider(x,z,13,9,b);
}
function makeWaterTower(x,z){
  const grp=new THREE.Group();
  const steel=std({color:0x5a6068,roughness:0.55,metalness:0.7});
  for(const [lx,lz] of [[-3,-3],[3,-3],[-3,3],[3,3]]){
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.4,14,8),steel);
    leg.position.set(lx,7,lz);leg.castShadow=true;grp.add(leg);
  }
  // cross braces
  for(const y of [4,8,11]){
    for(const [rx,rz,w,d] of [[0,-3,6.6,0.15],[0,3,6.6,0.15],[-3,0,0.15,6.6],[3,0,0.15,6.6]]){
      const br=new THREE.Mesh(new THREE.BoxGeometry(w,0.14,d),steel);br.position.set(rx,y,rz);grp.add(br);
    }
  }
  const rustM=std({color:0xa83c28,roughness:0.75,metalness:0.3});
  const tank=new THREE.Mesh(new THREE.CylinderGeometry(4.6,4.9,6,18),rustM);
  tank.position.y=17;tank.castShadow=true;grp.add(tank);
  // rivet bands + town name band (original text)
  for(const y of [14.8,17,19.2]){const band=new THREE.Mesh(new THREE.TorusGeometry(4.75,0.09,6,24),MAT.darkMetal);band.rotation.x=Math.PI/2;band.position.y=y;grp.add(band);}
  const bandT=canvasTex(256,(c,s)=>{c.fillStyle='#f5f2e8';c.fillRect(0,0,s,64);c.fillStyle='#7a2018';c.font='bold 40px Trebuchet MS';c.textAlign='center';c.fillText('ROCKWELL',s/2,46);});
  const band=new THREE.Mesh(new THREE.CylinderGeometry(4.92,4.92,1.6,18,1,true),new THREE.MeshStandardMaterial({map:bandT,roughness:0.7}));
  band.position.y=17;grp.add(band);
  const cone=new THREE.Mesh(new THREE.ConeGeometry(5.3,2.8,18),std({color:0x3a4048,roughness:0.5,metalness:0.6}));
  cone.position.y=21.4;cone.castShadow=true;grp.add(cone);
  const lad=new THREE.Mesh(new THREE.BoxGeometry(0.6,15,0.15),MAT.darkMetal);lad.position.set(0,8,3.4);grp.add(lad);
  grp.position.set(x,0,z);scene.add(grp);
  const b={mesh:grp,x,z,hx:4,hz:4,hp:140,maxHp:140,dead:false,isBuilding:true,name:'Water Tower',dna:40};
  WORLD.buildings.push(b);addCollider(x,z,4,4,b);
}
function makeBarn(x,z){
  const grp=new THREE.Group();
  const red=std({color:0x9a2a20,roughness:0.85});
  const trim=std({color:0xf5f2e8,roughness:0.7});
  const body=new THREE.Mesh(new THREE.BoxGeometry(16,6,10),red);
  body.position.y=3;body.castShadow=true;body.receiveShadow=true;grp.add(body);
  // gambrel roof (two slopes per side)
  for(const s of [-1,1]){
    const low=new THREE.Mesh(new THREE.BoxGeometry(5.4,0.25,11),MAT.roof2);low.position.set(s*3.4,8.2,0);low.rotation.z=s*-0.9;low.castShadow=true;grp.add(low);
    const up=new THREE.Mesh(new THREE.BoxGeometry(4.6,0.25,11),MAT.roof2);up.position.set(s*1.2,10.2,0);up.rotation.z=s*-0.35;up.castShadow=true;grp.add(up);
  }
  // big X doors + loft window
  for(const s of [-1,1]){
    const d=new THREE.Mesh(new THREE.BoxGeometry(2.6,4.4,0.15),trim);d.position.set(s*1.45,2.4,5.02);grp.add(d);
    const cross=new THREE.Mesh(new THREE.BoxGeometry(3.4,0.3,0.05),red);cross.position.set(s*1.45,2.4,5.12);cross.rotation.z=0.7;grp.add(cross);
  }
  const loft=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.6,0.12),trim);loft.position.set(0,7,5.02);grp.add(loft);
  // silo beside barn (original addition)
  const silo=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,11,14),std({color:0xb8bec4,roughness:0.4,metalness:0.6}));
  silo.position.set(10.5,5.5,0);silo.castShadow=true;grp.add(silo);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(2.2,14,8,0,Math.PI*2,0,Math.PI/2),std({color:0x8a2a20,roughness:0.6}));
  cap.position.set(10.5,11,0);grp.add(cap);
  grp.position.set(x,0,z);scene.add(grp);
  const b={mesh:grp,x,z,hx:8,hz:5,hp:160,maxHp:160,dead:false,isBuilding:true,name:'Barn',dna:35};
  WORLD.buildings.push(b);addCollider(x,z,8,5,b);
}
function makeMilitaryBase(x,z){
  // HD base: chain fence with posts + razor wire, tents with guy ropes, sandbags, bunker, towers
  const fenceM=std({color:0x6a7a6a,roughness:0.6,metalness:0.4});
  const postM=MAT.darkMetal;
  const per=[];
  for(let k=-40;k<=40;k+=8){per.push([x+k,z-35]);per.push([x+k,z+35]);}
  for(let k=-32;k<=32;k+=8){per.push([x-40,z+k]);per.push([x+40,z+k]);}
  for(const [px,pz] of per){const p=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,3.4,6),postM);p.position.set(px,1.7,pz);scene.add(p);}
  const fenceG=new THREE.BoxGeometry(1,2.6,0.06);
  for(let k=-4;k<=4;k++){
    for(const [px,pz,ry] of [[x+k*10,z-35,0],[x+k*10,z+35,0]]){
      const f=new THREE.Mesh(fenceG,fenceM);f.position.set(px,1.6,pz);scene.add(f);
      const wire=new THREE.Mesh(new THREE.TorusGeometry(0.35,0.07,5,10),std({color:0x9aa0a6,metalness:0.8,roughness:0.4}));
      wire.position.set(px,3.1,pz);wire.rotation.y=Math.PI/2;scene.add(wire);
    }
  }
  // tents: canvas + poles + ropes + crates
  const tentM=std({color:0x4a5d3a,roughness:0.95});
  for(let i=0;i<3;i++){
    const tx=x-20+i*20,tz=z-15;
    const t=new THREE.Group();
    const walls=new THREE.Mesh(new THREE.BoxGeometry(13,2.6,7),tentM);walls.position.y=1.3;walls.castShadow=true;t.add(walls);
    const roof=new THREE.Mesh(new THREE.CylinderGeometry(0.1,5.2,2.6,4,1),tentM);
    roof.rotation.y=Math.PI/4;roof.scale.set(1.45,1,0.95);roof.position.y=3.9;roof.castShadow=true;t.add(roof);
    for(const s of [-1,1]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,4.6,6),MAT.wood);pole.position.set(s*6,2.3,0);t.add(pole);}
    const flap=new THREE.Mesh(new THREE.PlaneGeometry(2,2.4),std({color:0x2e3d24,roughness:1,side:THREE.DoubleSide}));flap.position.set(0,1.3,3.55);t.add(flap);
    t.position.set(tx,0,tz);scene.add(t);
    // sandbags + crates
    for(let sb=0;sb<6;sb++){const bag=new THREE.Mesh(new THREE.CapsuleGeometry(0.35,0.7,3,6),std({color:0x9a8a5a,roughness:1}));bag.rotation.z=Math.PI/2;bag.position.set(tx-6+sb*2.2,0.35,tz+4.6);bag.castShadow=true;scene.add(bag);}
    const b={mesh:t,x:tx,z:tz,hx:7,hz:4,hp:180,maxHp:180,dead:false,isBuilding:true,name:'Barracks',dna:50};
    WORLD.buildings.push(b);addCollider(b.x,b.z,7,4,b);
  }
  // concrete bunker with slit + camo + searchlight
  const bunkG=new THREE.Group();
  const bunk=new THREE.Mesh(new THREE.BoxGeometry(20,5,13),std({map:TEX.concrete,color:0x8a949c,roughness:0.95}));
  bunk.position.y=2.5;bunk.castShadow=true;bunk.receiveShadow=true;bunkG.add(bunk);
  const slab=new THREE.Mesh(new THREE.BoxGeometry(22,1,15),std({map:TEX.concrete,color:0x7a848c}));slab.position.y=5.4;bunkG.add(slab);
  const slit=new THREE.Mesh(new THREE.BoxGeometry(16,0.7,0.2),new THREE.MeshStandardMaterial({color:0x0a0a0a}));slit.position.set(0,3.4,6.55);bunkG.add(slit);
  const sl=new THREE.Mesh(new THREE.CylinderGeometry(0.9,1,1.4,12),MAT.darkMetal);sl.position.set(6,6.6,0);bunkG.add(sl);
  const lens=new THREE.Mesh(new THREE.CircleGeometry(0.75,14),new THREE.MeshStandardMaterial({color:0xfff2c0,emissive:0xffedb0,emissiveIntensity:2}));lens.position.set(6,6.6,0.75);bunkG.add(lens);
  bunkG.position.set(x,0,z+15);scene.add(bunkG);
  const b2={mesh:bunkG,x,z:z+15,hx:10,hz:7,hp:350,maxHp:350,dead:false,isBuilding:true,name:'Command Bunker',dna:100};
  WORLD.buildings.push(b2);addCollider(x,z+15,10,7,b2);
  Game.spawnAA(x-25,z+5);Game.spawnAA(x+25,z+5);Game.spawnAA(x,z-28);
}
function makeTree(x,z){
  const g=new THREE.Group();
  const kind=Math.random();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.6,rand(2.6,3.6),7),MAT.wood);
  trunk.position.y=1.5;trunk.castShadow=true;g.add(trunk);
  if(kind<0.45){
    // oak: clustered blobs
    for(let i=0;i<5;i++){
      const c=new THREE.Mesh(new THREE.SphereGeometry(rand(1.4,2.3),10,8),i%2?MAT.leaf:MAT.leaf2);
      c.position.set(rand(-1.6,1.6),rand(3.6,5.6),rand(-1.6,1.6));c.castShadow=true;g.add(c);
    }
  } else if(kind<0.8){
    // pine: layered cones
    for(let i=0;i<3;i++){
      const c=new THREE.Mesh(new THREE.ConeGeometry(2.6-i*0.55,2.4,9),i%2?MAT.leaf:MAT.leaf2);
      c.position.y=3.4+i*1.7;c.castShadow=true;g.add(c);
    }
  } else {
    // poplar: tall thin
    const c=new THREE.Mesh(new THREE.ConeGeometry(1.4,6.5,8),MAT.leaf2);
    c.position.y=5.4;c.castShadow=true;g.add(c);
  }
  // roots / grass tuft
  const tuft=new THREE.Mesh(new THREE.ConeGeometry(0.9,0.8,6),MAT.leaf2);tuft.position.y=0.35;g.add(tuft);
  g.position.set(x,0,z);g.rotation.y=rand(0,6);g.scale.setScalar(rand(0.85,1.35));scene.add(g);
  WORLD.trees.push(g);
}
function makeLamp(x,z){
  const g=new THREE.Group();
  const base=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.45,0.6,10),std({map:TEX.concrete,color:0x9aa0a6}));
  base.position.y=0.3;g.add(base);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.18,7.4,8),std({color:0x2a343c,roughness:0.5,metalness:0.7}));
  pole.position.y=4;pole.castShadow=true;g.add(pole);
  const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,1.8,6),std({color:0x2a343c,metalness:0.7,roughness:0.5}));
  arm.rotation.z=Math.PI/2.3;arm.position.set(0.8,7.5,0);g.add(arm);
  const headM=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.28,0.4),MAT.darkMetal);headM.position.set(1.6,7.8,0);g.add(headM);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.22,10,10),new THREE.MeshStandardMaterial({color:0xfff2c0,emissive:0xffdf90,emissiveIntensity:3}));
  bulb.position.set(1.6,7.62,0);g.add(bulb);
  const cone=new THREE.Mesh(new THREE.ConeGeometry(2.4,3.4,14,1,true),new THREE.MeshBasicMaterial({color:0xffe9a8,transparent:true,opacity:0.10,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  cone.position.set(1.6,5.8,0);g.add(cone);
  g.position.set(x,0,z);scene.add(g);
}
function makeFences(){
  const woodM=std({color:0x7a5a34,roughness:0.9});
  const postG=new THREE.BoxGeometry(0.35,1.5,0.35);
  for(let x=-70;x<=70;x+=7){
    for(const fz of [108,192]){
      for(const off of [-3,0,3]){
        const p=new THREE.Mesh(postG,woodM);p.position.set(x+off,0.75,fz);p.castShadow=true;scene.add(p);
      }
      for(const ry of [0.7,1.2]){
        const r=new THREE.Mesh(new THREE.BoxGeometry(7,0.16,0.12),woodM);r.position.set(x,ry,fz);scene.add(r);
      }
    }
  }
  // ranch gate
  const gateT=canvasTex(256,(c,s)=>{c.fillStyle='#7a4a22';c.fillRect(0,0,s,64);c.fillStyle='#ffe9a8';c.font='bold 30px Trebuchet MS';c.textAlign='center';c.fillText('★ ROCKWELL RANCH ★',s/2,42);});
  const gate=new THREE.Mesh(new THREE.PlaneGeometry(10,2),new THREE.MeshStandardMaterial({map:gateT,roughness:0.85,side:THREE.DoubleSide}));
  gate.position.set(0,2.6,108);scene.add(gate);
  for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.BoxGeometry(0.5,3.4,0.5),woodM);p.position.set(s*5.2,1.7,108);p.castShadow=true;scene.add(p);}
}

// ============ CHARACTER FACTORIES (HD originals — homage, not copies) ============
function makeAlienMesh(){
  const g=new THREE.Group();
  const skin=MAT.alienSkin;
  // boots + suit legs
  for(const s of [-1,1]){
    const boot=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.22,0.5),std({color:0x141c26,roughness:0.5,metalness:0.4}));
    boot.position.set(s*0.24,0.11,0.06);boot.castShadow=true;g.add(boot);
    const leg=new THREE.Mesh(new THREE.CapsuleGeometry(0.15,0.55,4,10),skin);
    leg.position.set(s*0.24,0.55,0);leg.castShadow=true;g.add(leg);
    const thigh=new THREE.Mesh(new THREE.CapsuleGeometry(0.17,0.4,4,10),std({color:0x1a2a3a,roughness:0.6}));
    thigh.position.set(s*0.24,0.95,0);g.add(thigh);
  }
  // armored torso suit with chest core + belt + collar
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(0.42,0.7,6,14),std({color:0x1c2f42,roughness:0.45,metalness:0.35}));
  torso.position.y=1.55;torso.castShadow=true;g.add(torso);
  const chest=new THREE.Mesh(new THREE.SphereGeometry(0.2,12,10),new THREE.MeshStandardMaterial({color:0x00ffcc,emissive:0x00ffcc,emissiveIntensity:2.2}));
  chest.position.set(0,1.7,0.38);chest.scale.set(1,1.2,0.5);g.add(chest);
  const belt=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.07,8,18),std({color:0x8a949c,metalness:0.9,roughness:0.3}));
  belt.rotation.x=Math.PI/2;belt.position.y=1.1;g.add(belt);
  const collar=new THREE.Mesh(new THREE.TorusGeometry(0.3,0.08,8,16),std({color:0x8a949c,metalness:0.9,roughness:0.3}));
  collar.position.y=2.02;g.add(collar);
  // long arms with gloves + claws
  for(const s of [-1,1]){
    const sh=new THREE.Mesh(new THREE.SphereGeometry(0.17,10,8),std({color:0x1c2f42,metalness:0.4,roughness:0.5}));
    sh.position.set(s*0.55,1.85,0);g.add(sh);
    const arm=new THREE.Mesh(new THREE.CapsuleGeometry(0.11,0.62,4,8),skin);
    arm.position.set(s*0.62,1.4,0.05);arm.rotation.z=s*0.18;arm.castShadow=true;g.add(arm);
    const glove=new THREE.Mesh(new THREE.SphereGeometry(0.15,10,8),skin);
    glove.position.set(s*0.68,1.0,0.12);glove.scale.set(0.9,1.25,1);g.add(glove);
    for(let f=0;f<3;f++){const claw=new THREE.Mesh(new THREE.ConeGeometry(0.035,0.16,6),std({color:0xd8e8d0,roughness:0.4}));claw.position.set(s*0.68+(f-1)*0.08,0.86,0.16);claw.rotation.x=Math.PI;g.add(claw);}
  }
  // big cranium + brow + glossy eyes + breathing slits (original sculpt)
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.72,24,18),skin);
  head.position.y=2.62;head.scale.set(1.05,1.18,0.98);head.castShadow=true;g.add(head);
  const jaw=new THREE.Mesh(new THREE.SphereGeometry(0.34,14,10),skin);
  jaw.position.set(0,2.18,0.28);jaw.scale.set(1,0.7,0.8);g.add(jaw);
  const eyeMat=new THREE.MeshPhysicalMaterial({color:0x050d0c,roughness:0.05,metalness:0.1,clearcoat:1});
  for(const s of [-1,1]){
    const socket=new THREE.Mesh(new THREE.SphereGeometry(0.3,14,12),std({color:0x4a7a5a,roughness:0.5}));
    socket.position.set(s*0.31,2.72,0.5);socket.scale.set(0.85,1.25,0.6);socket.rotation.z=s*-0.3;socket.rotation.y=s*0.25;g.add(socket);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(0.26,16,14),eyeMat);
    eye.position.set(s*0.32,2.72,0.56);eye.scale.set(0.72,1.18,0.55);eye.rotation.z=s*-0.3;g.add(eye);
    const glint=new THREE.Mesh(new THREE.SphereGeometry(0.05,8,8),new THREE.MeshBasicMaterial({color:0xbfffff}));
    glint.position.set(s*0.28,2.86,0.72);g.add(glint);
  }
  // antenna nubs + neck rings
  for(const s of [-1,1]){const nub=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,8),skin);nub.position.set(s*0.5,3.0,-0.15);g.add(nub);}
  // jetpack: twin tanks + thrusters + glow
  const pack=new THREE.Group();
  const shell=new THREE.Mesh(new THREE.BoxGeometry(0.78,0.95,0.4),std({color:0x39434e,roughness:0.4,metalness:0.75}));
  shell.castShadow=true;pack.add(shell);
  for(const s of [-1,1]){
    const tank=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,0.8,10),MAT.chrome);
    tank.position.set(s*0.24,0.05,0.26);pack.add(tank);
    const noz=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.16,0.22,10),MAT.darkMetal);
    noz.position.set(s*0.24,-0.5,0.1);pack.add(noz);
    const glow=new THREE.Mesh(new THREE.ConeGeometry(0.13,0.7,10),new THREE.MeshBasicMaterial({color:0x55ddff,transparent:true,opacity:0.85,blending:THREE.AdditiveBlending,depthWrite:false}));
    glow.position.set(s*0.24,-0.9,0.1);glow.rotation.x=Math.PI;glow.visible=false;glow.name='flame'+s;pack.add(glow);
  }
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.1,0.02),new THREE.MeshStandardMaterial({color:0x00ffcc,emissive:0x00ffcc,emissiveIntensity:1.6}));
  stripe.position.set(0,0.25,0.21);pack.add(stripe);
  pack.position.set(0,1.55,-0.55);g.add(pack);
  const flame=new THREE.Mesh(new THREE.ConeGeometry(0.3,1,10),new THREE.MeshBasicMaterial({color:0x55ddff,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending,depthWrite:false}));
  flame.position.set(0,0.7,-0.55);flame.rotation.x=Math.PI;flame.visible=false;flame.name='flame';g.add(flame);
  // zap gauntlet gun
  const gunG=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.2,0.85),std({color:0x222d38,metalness:0.7,roughness:0.4}));gunG.add(body);
  const coil=new THREE.Mesh(new THREE.TorusGeometry(0.11,0.035,8,14),new THREE.MeshStandardMaterial({color:0x00ffcc,emissive:0x00ffcc,emissiveIntensity:2}));
  coil.position.z=0.2;gunG.add(coil);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(0.07,10,10),new THREE.MeshStandardMaterial({color:0xccffff,emissive:0x7dfffa,emissiveIntensity:2.5}));
  tip.position.z=0.5;gunG.add(tip);
  gunG.position.set(0.68,1.05,0.35);gunG.rotation.x=-0.1;g.add(gunG);
  return g;
}
function makeSaucerMesh(){
  // HD saucer — original two-tier disc, glass canopy with pilot, light ring, engine glow
  const g=new THREE.Group();
  const hull=MAT.saucerHull;
  const lower=new THREE.Mesh(new THREE.CylinderGeometry(4.3,3.2,0.9,28),MAT.saucerDark);
  lower.position.y=-0.35;lower.castShadow=true;g.add(lower);
  const mid=new THREE.Mesh(new THREE.CylinderGeometry(3.5,4.3,0.8,28),hull);
  mid.position.y=0.35;mid.castShadow=true;g.add(mid);
  const deck=new THREE.Mesh(new THREE.CylinderGeometry(2.6,3.0,0.5,24),hull);
  deck.position.y=0.95;deck.castShadow=true;g.add(deck);
  // panel lines + vents
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;
    const vent=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.12,1.1),MAT.saucerDark);
    vent.position.set(Math.cos(a)*3.6,0.0,Math.sin(a)*3.6);vent.rotation.y=-a;g.add(vent);}
  // glowing rim ring (spins)
  const rim=new THREE.Mesh(new THREE.TorusGeometry(3.95,0.22,10,40),new THREE.MeshStandardMaterial({color:0x00ffcc,emissive:0x00ffcc,emissiveIntensity:2.4}));
  rim.rotation.x=Math.PI/2;rim.position.y=-0.15;g.add(rim);rim.name='rim';
  const rim2=new THREE.Mesh(new THREE.TorusGeometry(3.95,0.08,8,40),new THREE.MeshBasicMaterial({color:0xccffff}));
  rim2.rotation.x=Math.PI/2;rim2.position.y=-0.15;g.add(rim2);
  // glass canopy + pilot + dashboard glow
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1.7,24,14,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhysicalMaterial({color:0xaadcee,roughness:0.05,metalness:0,transparent:true,opacity:0.42,clearcoat:1}));
  dome.position.y=1.15;g.add(dome);
  const seat=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.6,0.8,10),std({color:0x222d38,roughness:0.6}));seat.position.y=1.3;g.add(seat);
  const pilot=new THREE.Mesh(new THREE.SphereGeometry(0.52,18,14),MAT.alienSkin);
  pilot.position.y=1.95;pilot.scale.set(1,1.2,0.95);g.add(pilot);
  for(const s of [-1,1]){const pe=new THREE.Mesh(new THREE.SphereGeometry(0.19,12,10),new THREE.MeshPhysicalMaterial({color:0x050d0c,roughness:0.05,clearcoat:1}));pe.position.set(s*0.23,2.02,0.38);pe.scale.set(0.7,1.2,0.5);g.add(pe);}
  const dash=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.25,0.4),new THREE.MeshStandardMaterial({color:0x00ffcc,emissive:0x00ffcc,emissiveIntensity:1.4}));
  dash.position.set(0,1.5,1.1);g.add(dash);
  // perimeter lights with housings
  g.userData.lights=[];
  for(let i=0;i<10;i++){
    const a=i/10*Math.PI*2;
    const housing=new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.28,0.2,10),MAT.saucerDark);
    housing.position.set(Math.cos(a)*3.9,-0.55,Math.sin(a)*3.9);g.add(housing);
    const l=new THREE.Mesh(new THREE.SphereGeometry(0.17,10,10),new THREE.MeshStandardMaterial({color:i%2?0xff3355:0x7dfffa,emissive:i%2?0xff2244:0x00ffcc,emissiveIntensity:2.6}));
    l.position.set(Math.cos(a)*3.9,-0.68,Math.sin(a)*3.9);
    g.add(l);g.userData.lights.push(l);
  }
  // bottom engine glow + abduct beam (volumetric look: core + outer)
  const engine=new THREE.Mesh(new THREE.CircleGeometry(1.7,20),new THREE.MeshBasicMaterial({color:0x7dfffa,transparent:true,opacity:0.75,blending:THREE.AdditiveBlending,depthWrite:false}));
  engine.rotation.x=Math.PI/2;engine.position.y=-0.82;engine.name='engine';g.add(engine);
  const beamOuter=new THREE.Mesh(new THREE.CylinderGeometry(1.7,3.0,9,14,1,true),new THREE.MeshBasicMaterial({color:0x7CFC00,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  beamOuter.position.y=-5;beamOuter.name='abductBeam';g.add(beamOuter);
  const beamCore=new THREE.Mesh(new THREE.CylinderGeometry(0.9,1.6,9,12,1,true),new THREE.MeshBasicMaterial({color:0xeaffb0,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  beamCore.position.y=-5;beamCore.name='abductCore';g.add(beamCore);
  // death-ray emitter
  const gun=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.3,1.2,10),MAT.saucerDark);
  gun.rotation.x=Math.PI/2.4;gun.position.set(0,-0.7,2.8);g.add(gun);
  const gunTip=new THREE.Mesh(new THREE.SphereGeometry(0.24,12,10),new THREE.MeshStandardMaterial({color:0xff2222,emissive:0xff2222,emissiveIntensity:3}));
  gunTip.position.set(0,-0.95,3.3);g.add(gunTip);
  return g;
}
function makeHumanMesh(type){
  // HD 50s townsfolk — original sculpts: shoes, trousers/skirt, jacket, arms, face, period hats/hair
  const g=new THREE.Group();
  let shirt=0x3a6fd8,pants=0x2c343c,skinC=0xe8b88a;
  if(type==='civilian'){shirt=[0xc84a4a,0x3a6fd8,0xd8b84a,0x6aa88a,0xb87ab8,0xe8e0d0][randi(0,5)];pants=[0x2c343c,0x5a4020,0x6a6a7a][randi(0,2)];}
  else if(type==='farmer'){shirt=0x6a8a3a;pants=0x5a4020;}
  else if(type==='soldier'){shirt=0x46582e;pants=0x333f22;skinC=0xd8a878;}
  else if(type==='cop'){shirt=0x1e3f8a;pants=0x141c40;}
  else if(type==='agent'){shirt=0x181818;pants=0x101010;}
  else if(type==='commander'){shirt=0x0c0c0c;pants=0x0c0c0c;}
  const s=type==='commander'?1.28:1;
  const shirtM=std({color:shirt,roughness:0.85});
  const pantsM=std({color:pants,roughness:0.9});
  const skinM=std({color:skinC,roughness:0.6});
  const female=type==='civilian'&&Math.random()<0.45;
  // shoes + legs
  for(const sx of [-1,1]){
    const shoe=new THREE.Mesh(new THREE.BoxGeometry(0.16*s,0.12*s,0.3*s),std({color:0x2a1a0a,roughness:0.4}));
    shoe.position.set(sx*0.14*s,0.06*s,0.04);g.add(shoe);
    const leg=new THREE.Mesh(new THREE.CapsuleGeometry(0.11*s,0.55*s,3,8),female?skinM:pantsM);
    leg.position.set(sx*0.14*s,0.48*s,0);leg.castShadow=true;g.add(leg);
  }
  if(female){
    const skirt=new THREE.Mesh(new THREE.CylinderGeometry(0.3*s,0.42*s,0.55*s,12),shirtM);
    skirt.position.y=0.95*s;skirt.castShadow=true;g.add(skirt);
  } else {
    const hips=new THREE.Mesh(new THREE.BoxGeometry(0.44*s,0.3*s,0.28*s),pantsM);
    hips.position.y=0.9*s;g.add(hips);
  }
  // torso: jacket + collar + buttons
  const torso=new THREE.Mesh(new THREE.BoxGeometry(0.56*s,0.72*s,0.34*s),shirtM);
  torso.position.y=1.42*s;torso.castShadow=true;g.add(torso);
  const collar=new THREE.Mesh(new THREE.BoxGeometry(0.4*s,0.12*s,0.05*s),std({color:0xf5f2e8,roughness:0.8}));
  collar.position.set(0,1.76*s,0.17*s);g.add(collar);
  for(let bi2=0;bi2<3;bi2++){const btn=new THREE.Mesh(new THREE.SphereGeometry(0.03*s,6,6),std({color:0xeeeeee}));btn.position.set(0,(1.55-bi2*0.18)*s,0.18*s);g.add(btn);}
  // arms + hands
  for(const sx of [-1,1]){
    const arm=new THREE.Mesh(new THREE.CapsuleGeometry(0.09*s,0.5*s,3,8),shirtM);
    arm.position.set(sx*0.37*s,1.4*s,0);arm.rotation.z=sx*0.12;arm.castShadow=true;g.add(arm);
    const hand=new THREE.Mesh(new THREE.SphereGeometry(0.09*s,8,8),skinM);
    hand.position.set(sx*0.4*s,1.05*s,0);g.add(hand);
  }
  // head: skull + nose + ears
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.27*s,18,14),skinM);
  head.position.y=2.02*s;head.castShadow=true;g.add(head);
  const nose=new THREE.Mesh(new THREE.SphereGeometry(0.05*s,8,8),skinM);
  nose.position.set(0,2.0*s,0.27*s);g.add(nose);
  for(const sx of [-1,1]){const ear=new THREE.Mesh(new THREE.SphereGeometry(0.06*s,8,8),skinM);ear.position.set(sx*0.27*s,2.02*s,0);g.add(ear);}
  const hairC=[0x2a1a0a,0x6a4a1a,0x8a6a3a,0xd8d8d8,0x1a1a1a,0xa83c28][randi(0,5)];
  // headgear by role (original)
  if(type==='soldier'){
    const helm=new THREE.Mesh(new THREE.SphereGeometry(0.31*s,14,10,0,Math.PI*2,0,Math.PI/2),std({color:0x3d4d2a,roughness:0.7,metalness:0.3}));
    helm.position.y=2.1*s;g.add(helm);
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(0.33*s,0.33*s,0.05*s,14),std({color:0x3d4d2a,roughness:0.7}));
    brim.position.y=2.1*s;g.add(brim);
    const gunG=new THREE.Group();
    const stock=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.14,0.5),std({color:0x4a2f1a,roughness:0.7}));gunG.add(stock);
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.7,8),MAT.darkMetal);barrel.rotation.x=Math.PI/2;barrel.position.z=0.5;gunG.add(barrel);
    gunG.position.set(0.32*s,1.35*s,0.4);g.add(gunG);
  } else if(type==='cop'){
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.29*s,0.3*s,0.14*s,12),std({color:0x14245a,roughness:0.6}));cap.position.y=2.24*s;g.add(cap);
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(0.32*s,0.32*s,0.03*s,12),std({color:0x0a0a1a}));brim.position.set(0,2.18*s,0.08*s);g.add(brim);
    const badge=new THREE.Mesh(new THREE.CircleGeometry(0.05*s,8),std({color:0xd8b84a,metalness:1,roughness:0.3}));badge.position.set(-0.12*s,1.55*s,0.18*s);g.add(badge);
    const gun=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.12,0.4),MAT.darkMetal);gun.position.set(0.3*s,1.2*s,0.3);g.add(gun);
  } else if(type==='agent'||type==='commander'){
    const hat=new THREE.Mesh(new THREE.CylinderGeometry(0.26*s,0.28*s,0.24*s,12),std({color:0x0a0a0a,roughness:0.5}));hat.position.y=2.3*s;g.add(hat);
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(0.4*s,0.4*s,0.04*s,14),std({color:0x0a0a0a,roughness:0.5}));brim.position.y=2.2*s;g.add(brim);
    const tie=new THREE.Mesh(new THREE.BoxGeometry(0.09*s,0.4*s,0.03*s),std({color:type==='commander'?0x8a1020:0x333333}));tie.position.set(0,1.5*s,0.19*s);g.add(tie);
    const gun=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.14,0.45),MAT.darkMetal);gun.position.set(0.32*s,1.25*s,0.3);g.add(gun);
    if(type==='commander'){const glass=new THREE.Mesh(new THREE.BoxGeometry(0.4*s,0.1*s,0.05),std({color:0x111111,roughness:0.2}));glass.position.set(0,2.05*s,0.24*s);g.add(glass);}
  } else if(type==='farmer'){
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(0.42*s,0.42*s,0.04*s,14),std({color:0xc8a84a,roughness:0.9}));brim.position.y=2.2*s;g.add(brim);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(0.24*s,0.26*s,0.2*s,12),std({color:0xc8a84a,roughness:0.9}));top.position.y=2.32*s;g.add(top);
  } else {
    if(female){
      const bun=new THREE.Mesh(new THREE.SphereGeometry(0.14*s,10,8),std({color:hairC,roughness:0.7}));bun.position.set(0,2.2*s,-0.2*s);g.add(bun);
      const hair=new THREE.Mesh(new THREE.SphereGeometry(0.29*s,14,10,0,Math.PI*2,0,Math.PI/2.1),std({color:hairC,roughness:0.75}));
      hair.position.y=2.08*s;g.add(hair);
    } else {
      const hair=new THREE.Mesh(new THREE.SphereGeometry(0.285*s,14,10,0,Math.PI*2,0,Math.PI/2.3),std({color:hairC,roughness:0.8}));
      hair.position.y=2.07*s;g.add(hair);
      // side part
      const part=new THREE.Mesh(new THREE.BoxGeometry(0.3*s,0.06*s,0.2*s),std({color:hairC,roughness:0.8}));part.position.set(0.05*s,2.3*s,0.05*s);part.rotation.y=0.4;g.add(part);
    }
  }
  return g;
}
function makeCowMesh(){
  // HD holstein — rounded barrel body, snout, horns, tail, hooves (original)
  const g=new THREE.Group();
  const white=std({color:0xf0ece2,roughness:0.9});
  const black=std({color:0x1c1c1c,roughness:0.9});
  const pink=std({color:0xd8a090,roughness:0.7});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.75,1.5,6,12),white);
  body.rotation.z=Math.PI/2;body.position.y=1.15;body.castShadow=true;g.add(body);
  const hump=new THREE.Mesh(new THREE.SphereGeometry(0.6,12,10),white);hump.position.set(-0.4,1.6,0);hump.scale.set(1.2,0.8,0.9);g.add(hump);
  for(let i=0;i<4;i++){const sp=new THREE.Mesh(new THREE.SphereGeometry(rand(0.25,0.45),8,8),black);
    sp.position.set(rand(-0.9,0.9),rand(1.1,1.6),rand(-0.5,0.5));sp.scale.set(1,0.8,0.4);g.add(sp);}
  const headG=new THREE.Group();
  const skull=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.62,0.55),white);skull.castShadow=true;headG.add(skull);
  const snout=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.42,0.5),pink);snout.position.set(0.45,-0.08,0);headG.add(snout);
  for(const s of [-1,1]){const nos=new THREE.Mesh(new THREE.SphereGeometry(0.06,8,8),std({color:0x5a2a20}));nos.position.set(0.66,-0.05,s*0.13);headG.add(nos);}
  for(const s of [-1,1]){
    const ear=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.08,0.22),white);ear.position.set(-0.1,0.3,s*0.4);ear.rotation.z=0.3;headG.add(ear);
    const horn=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.3,8),std({color:0xd8ccb0,roughness:0.5}));horn.position.set(-0.05,0.42,s*0.25);headG.add(horn);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(0.08,8,8),std({color:0x1a0f08,roughness:0.2}));eye.position.set(0.2,0.1,s*0.3);headG.add(eye);
  }
  headG.position.set(1.5,1.35,0);g.add(headG);g.userData.head=headG;
  for(const [lx,lz] of [[-0.8,-0.35],[0.8,-0.35],[-0.8,0.35],[0.8,0.35]]){
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.12,1,8),white);leg.position.set(lx,0.5,lz);leg.castShadow=true;g.add(leg);
    const hoof=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.18,8),std({color:0x2a2018,roughness:0.6}));hoof.position.set(lx,0.09,lz);g.add(hoof);
  }
  const udder=new THREE.Mesh(new THREE.SphereGeometry(0.3,10,8),pink);udder.position.set(-0.5,0.65,0);udder.scale.set(1,0.8,0.8);g.add(udder);
  const tail=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.03,1.1,6),white);tail.position.set(-1.45,1.2,0);tail.rotation.z=0.4;g.add(tail);
  const tuft=new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8),black);tuft.position.set(-1.68,0.7,0);g.add(tuft);
  return g;
}
function makeCarMesh(color=0xd84a4a){
  // HD 50s sedan — fins, chrome, whitewalls, glasshouse (original)
  const g=new THREE.Group();
  const paint=std({color,roughness:0.25,metalness:0.55});
  const lower=new THREE.Mesh(new THREE.BoxGeometry(4.4,0.65,1.95),paint);
  lower.position.y=0.72;lower.castShadow=true;g.add(lower);
  const mid2=new THREE.Mesh(new THREE.BoxGeometry(3.9,0.5,1.85),paint);
  mid2.position.set(-0.1,1.2,0);mid2.castShadow=true;g.add(mid2);
  const cab=new THREE.Mesh(new THREE.BoxGeometry(2.1,0.62,1.65),MAT.glass);
  cab.position.set(-0.25,1.75,0);g.add(cab);
  const roofP=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.12,1.75),paint);
  roofP.position.set(-0.25,2.1,0);roofP.castShadow=true;g.add(roofP);
  // tail fins + chrome
  for(const s of [-1,1]){
    const fin=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.55,0.12),paint);
    fin.position.set(-1.9,1.35,s*0.9);fin.rotation.z=0.25;g.add(fin);
    const tail=new THREE.Mesh(new THREE.SphereGeometry(0.11,8,8),new THREE.MeshStandardMaterial({color:0xff2222,emissive:0xff2222,emissiveIntensity:1.5}));
    tail.position.set(-2.4,1.35,s*0.9);g.add(tail);
  }
  const bumpF=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,2.1),MAT.chrome);bumpF.position.set(2.3,0.55,0);g.add(bumpF);
  const bumpR=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,2.1),MAT.chrome);bumpR.position.set(-2.3,0.55,0);g.add(bumpR);
  const grille=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.4,1.6),MAT.chrome);grille.position.set(2.22,0.85,0);g.add(grille);
  for(const s of [-1,1]){const hl=new THREE.Mesh(new THREE.SphereGeometry(0.16,10,10),new THREE.MeshStandardMaterial({color:0xfff6d8,emissive:0xffedb0,emissiveIntensity:1.2}));hl.position.set(2.15,1.05,s*0.65);g.add(hl);}
  // whitewall wheels with hubcaps
  for(const [lx,lz] of [[-1.45,-0.95],[1.45,-0.95],[-1.45,0.95],[1.45,0.95]]){
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.46,0.32,16),MAT.tire);
    tire.rotation.x=Math.PI/2;tire.position.set(lx,0.46,lz);tire.castShadow=true;g.add(tire);
    const wall=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,0.34,14),MAT.whitewall);
    wall.rotation.x=Math.PI/2;wall.position.set(lx,0.46,lz);g.add(wall);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.36,10),MAT.chrome);
    hub.rotation.x=Math.PI/2;hub.position.set(lx,0.46,lz);g.add(hub);
  }
  return g;
}
function makeTankMesh(){
  // HD Patton-style tank — sloped hull, tracks with wheels, turret details (original)
  const g=new THREE.Group();
  const olive=std({color:0x4a5d33,roughness:0.7,metalness:0.25});
  const oliveD=std({color:0x3a4a28,roughness:0.75,metalness:0.2});
  for(const s of [-1,1]){
    const track=new THREE.Mesh(new THREE.BoxGeometry(5.4,1,0.7),std({color:0x222222,roughness:0.9}));
    track.position.set(0,0.6,s*1.55);track.castShadow=true;g.add(track);
    for(let wI=0;wI<5;wI++){const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.38,0.74,12),oliveD);
      wh.rotation.x=Math.PI/2;wh.position.set(-2+wI*1,0.6,s*1.55);g.add(wh);}
  }
  const hull=new THREE.Mesh(new THREE.BoxGeometry(5,0.9,2.6),olive);
  hull.position.y=1.45;hull.castShadow=true;g.add(hull);
  const glacis=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.8,2.6),olive);
  glacis.position.set(2.9,1.25,0);glacis.rotation.z=-0.5;g.add(glacis);
  const turret=new THREE.Group();
  const tdome=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.35,0.85,12),olive);
  tdome.castShadow=true;turret.add(tdome);
  const hatch=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.45,0.15,10),oliveD);hatch.position.set(-0.4,0.5,0);turret.add(hatch);
  const mg=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.9,6),MAT.darkMetal);mg.position.set(-0.4,0.9,0);mg.rotation.x=0.4;turret.add(mg);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.17,3.6,10),std({color:0x333a28,roughness:0.6,metalness:0.5}));
  barrel.rotation.z=Math.PI/2;barrel.position.set(2.6,0.1,0);turret.add(barrel);
  const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.5,10),MAT.darkMetal);muzzle.rotation.z=Math.PI/2;muzzle.position.set(4.2,0.1,0);turret.add(muzzle);
  const ant=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1.6,5),MAT.darkMetal);ant.position.set(-1,1.2,-0.8);turret.add(ant);
  turret.position.y=2.3;turret.name='turret';g.add(turret);
  // headlight + tools
  const hl=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8),new THREE.MeshStandardMaterial({color:0xfff2c0,emissive:0xffedb0,emissiveIntensity:1}));hl.position.set(2.6,1.5,1);g.add(hl);
  return g;
}
function makeAAMesh(){
  // HD 90mm AA — concrete pit, mount, twin barrels, shield, ammo (original)
  const g=new THREE.Group();
  const pit=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.4,0.5,14),std({map:TEX.concrete,color:0x9aa0a6}));
  pit.position.y=0.25;pit.receiveShadow=true;g.add(pit);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1,1.3,0.9,12),std({color:0x4a5240,roughness:0.7,metalness:0.3}));
  base.position.y=0.9;base.castShadow=true;g.add(base);
  const pivot=new THREE.Mesh(new THREE.SphereGeometry(0.55,12,10),MAT.darkMetal);pivot.position.y=1.6;g.add(pivot);
  const gun=new THREE.Group();
  const cradle=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.7,1),std({color:0x3d4a35,roughness:0.65,metalness:0.3}));gun.add(cradle);
  for(const s of [-1,1]){
    const b=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.15,4.2,10),std({color:0x2c343c,roughness:0.45,metalness:0.7}));
    b.position.set(s*0.32,0.5,0.6);b.rotation.x=-0.9;gun.add(b);
    const tip=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.3,8),MAT.darkMetal);
    tip.position.set(s*0.32,1.35,2.2);tip.rotation.x=-0.9;gun.add(tip);
  }
  const shield=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.1,0.12),std({color:0x55604a,roughness:0.7,metalness:0.3}));
  shield.position.set(0,0.5,-0.4);shield.rotation.x=0.25;gun.add(shield);
  const ammo=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.5,0.8),std({color:0x6a5a2a,roughness:0.8}));ammo.position.set(1.1,-0.2,-0.5);gun.add(ammo);
  gun.position.y=1.7;gun.name='gun';g.add(gun);
  // sandbag ring
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2;const bag=new THREE.Mesh(new THREE.CapsuleGeometry(0.3,0.6,3,6),std({color:0x9a8a5a,roughness:1}));bag.rotation.z=Math.PI/2;bag.rotation.y=-a;bag.position.set(Math.cos(a)*2.6,0.65,Math.sin(a)*2.6);g.add(bag);}
  return g;
}

// ============ GAME ============
const Game={
  state:'menu',paused:false,
  mode:'foot', // foot | saucer
  weapon:0, // 0 zap,1 disint,2 pk
  dna:0,kills:0,armorKills:0,troopKills:0,buildingsDown:0,
  mission:0,missionDone:false,freeRoam:false,
  time:0,alert:0,alertDecay:0,
  shockCD:0,fireCD:0,pkHeld:null,
  player:{pos:new THREE.Vector3(0,0,150),vel:new THREE.Vector3(),yaw:Math.PI,pitch:-0.15,hp:100,shield:100,fuel:100,onGround:true,vy:0},
  saucer:{pos:new THREE.Vector3(0,8,160),vel:new THREE.Vector3(),yaw:0,hull:200,shield:200},
  humans:[],cows:[],cars:[],tanks:[],aas:[],projectiles:[],dnaOrbs:[],
  boss:null,bossSpawned:false,
  camDist:7,
  missions:[
    {name:'Mission 1 — Harvest',title:'Collect 800 DNA',desc:'Abduct (RMB in saucer) or vaporize humans & cows. Abduction pays double. Cows in the south pasture are easy pickings.',quota:800,prog:()=>Game.dna},
    {name:'Mission 2 — Crackdown',title:'Break the Army: 6 armor + 12 troops',desc:'The Army is here. Destroy tanks / AA (armor) and down soldiers / cops. Use the saucer Death Ray (LMB) and shockwave (Q).',quota:1,prog:()=> (Game.armorKills>=6&&Game.troopKills>=12)?1:0},
    {name:'Mission 3 — Annihilation',title:'Raze 18 buildings + kill Commander',desc:'Flatten Rockwell. Then Majestic Commander Black appears at Town Hall — melt him.',quota:1,prog:()=> (Game.buildingsDown>=18&&(Game.boss&&Game.boss.dead))?1:0},
  ],
  init(){
    buildWorld();
    this.alien=makeAlienMesh();scene.add(this.alien);
    this.saucerMesh=makeSaucerMesh();scene.add(this.saucerMesh);
    this.saucerMesh.position.copy(this.saucer.pos);
    this.spawnInitialPop();
    Input.init(renderer.domElement);
    this.bindUI();
    this.hint('Find the saucer in the south pasture — walk to it, press F',12);
    requestAnimationFrame(t=>this.loop(t));
  },
  bindUI(){
    $('playBtn').onclick=()=>{AudioSys.init();AudioSys.ui();this.startGame();};
    $('howBtn').onclick=()=>{AudioSys.ui();$('how').classList.remove('hidden');};
    $('backBtn').onclick=()=>{AudioSys.ui();$('how').classList.add('hidden');};
    $('resumeBtn').onclick=()=>this.togglePause(true);
    $('restartBtn').onclick=()=>location.reload();
    $('retryBtn').onclick=()=>location.reload();
    $('againBtn').onclick=()=>location.reload();
    $('continueBtn').onclick=()=>{AudioSys.ui();$('victory').classList.add('hidden');this.freeRoam=true;this.state='playing';};
    $('briefBtn').onclick=()=>{AudioSys.ui();$('brief').classList.add('hidden');this.state='playing';};
    renderer.domElement.addEventListener('click',()=>{if(this.state==='playing'&&!Input.locked)renderer.domElement.requestPointerLock?.();});
  },
  startGame(){
    $('menu').classList.add('hidden');$('how').classList.add('hidden');
    this.state='playing';
    renderer.domElement.requestPointerLock?.();
    this.feed('Crypto-137 deployed. Harvest DNA!', 'good');
    setTimeout(()=>AudioSys.alarm(),800);
  },
  togglePause(force){
    if(this.state!=='playing'&&!this.paused)return;
    if($('brief').classList.contains('hidden')===false)return;
    this.paused = force===true?false:!this.paused;
    $('pause').classList.toggle('hidden',!this.paused);
    if(this.paused)document.exitPointerLock?.();
  },
  setWeapon(i){ if(this.mode!=='foot')return; this.weapon=i;AudioSys.ui(); this.updateWeaponUI(); },
  updateWeaponUI(){
    for(let i=0;i<3;i++)$('w'+i).classList.toggle('active',i===this.weapon&&this.mode==='foot');
    if(this.mode==='saucer'){for(let i=0;i<3;i++)$('w'+i).classList.remove('active');}
    const labels={foot:['JETPACK','JETPACK','JETPACK'],saucer:['BOOST','BOOST','BOOST']};
  },
  toggleSaucer(){
    if(this.state!=='playing'||this.paused)return;
    if(this.mode==='foot'){
      const d=dist2D(this.player.pos.x,this.player.pos.z,this.saucer.pos.x,this.saucer.pos.z);
      if(d<9&&this.saucer.pos.y<12){ this.mode='saucer';AudioSys.pickup();this.feed('Saucer boarded. Death Ray online (LMB). Abduct with RMB.','good');this.hint('LMB Death Ray · hold RMB Abduct · Q shockwave · F exit · Space/C up/down',6); }
      else this.hint('Saucer too far — glowing green marker. Follow it!',2.5);
    } else {
      if(this.saucer.pos.y<14){
        this.mode='foot';
        this.player.pos.set(this.saucer.pos.x,0,this.saucer.pos.z+5);
        this.player.hp=Math.max(this.player.hp,40);
        AudioSys.ui();this.feed('Crypto on foot. Zap-O-Matic ready.');
        this.releasePK();
      } else this.hint('Land lower (hold C) before exiting!',2.5);
    }
    this.updateWeaponUI();
  },
  shockwave(){
    if(this.state!=='playing'||this.paused||this.mode!=='saucer'||this.shockCD>0)return;
    this.shockCD=6;AudioSys.shock();
    const p=this.saucer.pos;
    FX.ring(p.x,Math.max(1,p.y-4),p.z,0x7dfffa,26);
    Particles.spawn(p.x,p.y-2,p.z,0x7dfffa,40,20,0.8,6,4);
    for(const h of this.humans){ if(h.dead)continue; const d=h.mesh.position.distanceTo(p); if(d<30){ this.damageHuman(h,120,p); const dir=h.mesh.position.clone().sub(p).normalize(); h.fly={vx:dir.x*25,vy:14,vz:dir.z*25,t:1}; } }
    for(const t of this.tanks){ if(t.dead)continue; if(t.mesh.position.distanceTo(p)<32)this.damageTank(t,90); }
    for(const c of this.cars){ if(c.dead)continue; if(c.mesh.position.distanceTo(p)<30)this.explodeCar(c); }
    for(const b of WORLD.buildings){ if(b.dead)continue; if(dist2D(b.x,b.z,p.x,p.z)<26)this.damageBuilding(b,120); }
  },
  spawnInitialPop(){
    for(let i=0;i<26;i++)this.spawnHuman('civilian');
    for(let i=0;i<6;i++)this.spawnHuman('farmer',-60+i*15,140+rand(-20,20));
    for(let i=0;i<8;i++)this.spawnCow();
    for(let i=0;i<5;i++)this.spawnCar();
    // saucer marker beacon
  },
  randStreetPos(){
    for(let t=0;t<20;t++){const x=rand(-200,200),z=rand(-200,105);if(!collides(x,z,1.5))return{x,z};}
    return{x:rand(-50,50),z:rand(20,60)};
  },
  spawnHuman(type,x,z){
    const p=x!==undefined?{x,z}:this.randStreetPos();
    const mesh=makeHumanMesh(type);
    mesh.position.set(p.x,0,p.z);scene.add(mesh);
    const hp=type==='soldier'?70:type==='cop'?55:type==='agent'?110:type==='commander'?600:35;
    const h={mesh,type,hp,maxHp:hp,dead:false,dir:rand(0,Math.PI*2),speed:type==='civilian'?2.2:2.8,state:'wander',fear:0,shootCD:rand(0,1),wanderT:rand(1,4),fly:null,abducted:false};
    this.humans.push(h);return h;
  },
  spawnCow(x,z){
    const px=x??rand(-60,60),pz=z??rand(115,185);
    const mesh=makeCowMesh();mesh.position.set(px,0,pz);mesh.rotation.y=rand(0,6);scene.add(mesh);
    const c={mesh,hp:40,dead:false,dir:rand(0,6),t:rand(1,4),fly:null};this.cows.push(c);return c;
  },
  spawnCar(){
    const colors=[0xd84a4a,0x3a6fd8,0xe8c84a,0x3a3a3a,0x7ab88a];
    const mesh=makeCarMesh(colors[randi(0,4)]);
    const lane=[-140,-70,0,70,140][randi(0,4)];
    const horiz=Math.random()<0.5;
    mesh.position.set(horiz?rand(-200,200):lane,0,horiz?lane:rand(-200,100));
    scene.add(mesh);
    this.cars.push({mesh,dead:false,speed:rand(8,14)*(Math.random()<0.5?1:-1),horiz,lane,hp:60});
  },
  spawnTank(){
    const mesh=makeTankMesh();
    const edge=randi(0,3);
    let x,z; if(edge===0){x=rand(-200,200);z=-210;}else if(edge===1){x=210;z=rand(-200,100);}else if(edge===2){x=-210;z=rand(-200,100);}else{x=140+rand(-20,20);z=-140+rand(-20,20);}
    mesh.position.set(x,0,z);scene.add(mesh);
    this.tanks.push({mesh,dead:false,hp:160,shootCD:rand(1,2),speed:6});
    this.feed('⚠️ Army armor inbound!','bad');
  },
  spawnAA(x,z){
    const mesh=makeAAMesh();mesh.position.set(x,0,z);scene.add(mesh);
    this.aas.push({mesh,x,z,dead:false,hp:120,shootCD:1});
  },
  spawnSoldier(){
    const bx=140+rand(-30,30),bz=-140+rand(-20,30);
    const t=Math.random()<0.7?'soldier':'cop';
    this.spawnHuman(t,bx+rand(-8,8),bz+rand(-8,8));
  },
  spawnBoss(){
    if(this.bossSpawned)return;this.bossSpawned=true;
    const b=this.spawnHuman('commander',8,8);
    b.hp=b.maxHp=600;this.boss=b;
    this.feed('☠️ MAJESTIC COMMANDER BLACK has arrived at Town Hall! Melt him!','bad');
    AudioSys.alarm();
  },
  feed(msg,cls=''){
    const f=$('feed');const d=document.createElement('div');if(cls)d.className=cls;d.textContent=msg;f.prepend(d);
    while(f.children.length>5)f.lastChild.remove();
    setTimeout(()=>{d.style.opacity='0';d.style.transition='opacity .5s';setTimeout(()=>d.remove(),500);},4200);
  },
  hint(msg,secs=4){
    $('hint').textContent=msg;$('hint').style.display='block';
    clearTimeout(this._hintT);this._hintT=setTimeout(()=>$('hint').style.display='none',secs*1000);
  },
  // ---- DAMAGE ----
  addDNA(n,x,y,z){
    this.dna+=n;
    if(this.mode==='foot'){this.player.hp=clamp(this.player.hp+n*0.05,0,100);this.player.shield=clamp(this.player.shield+n*0.08,0,100);}
    else{this.saucer.hull=clamp(this.saucer.hull+n*0.03,0,200);}
    Particles.spawn(x,y,z,0xb6ff5e,8,6,0.7,5,4);
    if(Math.random()<0.4)AudioSys.pickup();
  },
  damageHuman(h,dmg,from){
    if(h.dead)return;
    h.hp-=dmg;h.fear=1;
    if(h.hp<=0){
      h.dead=true;this.kills++;this.dna+=10;
      if(['soldier','cop','agent','commander'].includes(h.type)){this.troopKills++;}
      this.alert=clamp(this.alert+dmg*0.004+0.15,0,5);
      Particles.spawn(h.mesh.position.x,1.5,h.mesh.position.z,h.type==='commander'?0x111111:0xff3355,14,8,0.8,5,10);
      Particles.spawn(h.mesh.position.x,1.5,h.mesh.position.z,0xb6ff5e,8,6,0.9,6,4);
      this.addDNA(10,h.mesh.position.x,2,h.mesh.position.z);
      // death anim: fall
      h.mesh.rotation.x=-Math.PI/2;h.mesh.position.y=0.3;
      setTimeout(()=>{scene.remove(h.mesh);},4000);
      if(h===this.boss){this.feed('Commander Black vaporized! 👽','good');AudioSys.explosion();}
      else if(Math.random()<0.25)this.feed(h.type==='soldier'||h.type==='cop'?'Troop down! +DNA':'Civilian vaporized! +DNA');
      AudioSys.explosion();
    } else {
      Particles.spawn(h.mesh.position.x,1.5,h.mesh.position.z,0xffee55,4,5,0.4,3,6);
      if(h.type==='soldier'||h.type==='cop'||h.type==='agent'||h.type==='commander'){h.state='attack';}
      else h.state='flee';
    }
  },
  damageTank(t,dmg){
    if(t.dead)return;t.hp-=dmg;
    Particles.spawn(t.mesh.position.x,2,t.mesh.position.z,0xffaa00,8,9,0.5,4,8);
    if(t.hp<=0){t.dead=true;this.kills++;this.armorKills++;this.alert=clamp(this.alert+0.6,0,5);
      AudioSys.explosion();
      Particles.spawn(t.mesh.position.x,2,t.mesh.position.z,0xff5500,40,16,1.2,8,8);
      Particles.spawn(t.mesh.position.x,2,t.mesh.position.z,0x333333,25,10,1.5,7,6);
      FX.ring(t.mesh.position.x,1,t.mesh.position.z,0xff6600,12);
      t.mesh.rotation.z=0.4;t.mesh.position.y=-0.5;
      this.addDNA(60,t.mesh.position.x,3,t.mesh.position.z);
      this.feed('Armor destroyed! +60 DNA','good');
      setTimeout(()=>scene.remove(t.mesh),6000);
    }
  },
  damageAA(a,dmg){
    if(a.dead)return;a.hp-=dmg;
    if(a.hp<=0){a.dead=true;this.kills++;this.armorKills++;this.alert=clamp(this.alert+0.5,0,5);
      AudioSys.explosion();Particles.spawn(a.mesh.position.x,2,a.mesh.position.z,0xff5500,35,14,1,7,8);
      this.addDNA(50,a.mesh.position.x,3,a.mesh.position.z);this.feed('AA gun destroyed!','good');
      a.mesh.rotation.x=1.2;setTimeout(()=>scene.remove(a.mesh),5000);
    }
  },
  damageBuilding(b,dmg){
    if(b.dead)return;b.hp-=dmg;
    if(b.hp<=0){
      b.dead=true;this.buildingsDown++;this.alert=clamp(this.alert+0.4,0,5);
      AudioSys.explosion();
      const {x,z}=b;
      Particles.spawn(x,4,z,0xff6600,45,18,1.2,9,9);
      Particles.spawn(x,5,z,0x555555,30,12,1.8,8,5);
      Particles.spawn(x,3,z,0xffee55,20,14,0.7,7,8);
      FX.ring(x,1,z,0xff8800,16);
      // collapse
      b.mesh.rotation.z=rand(-0.15,0.15);b.mesh.position.y=-b.mesh.position.y*0-1.5;
      b.mesh.scale.y=0.25;
      b.mesh.traverse?.(o=>{if(o.material&&o.material.color)o.material.color.multiplyScalar(0.35);});
      const col=WORLD.colliders.find(c=>c.ref===b);if(col)col.dead=true;
      this.addDNA(b.dna,x,5,z);
      this.feed(`${b.name} leveled! +${b.dna} DNA`,'good');
    } else if(Math.random()<0.3){
      Particles.spawn(b.x,rand(2,6),b.z,0xffaa00,5,7,0.4,3,6);
    }
  },
  explodeCar(c){
    if(c.dead)return;c.dead=true;this.kills++;this.alert=clamp(this.alert+0.3,0,5);
    AudioSys.explosion();
    Particles.spawn(c.mesh.position.x,1,c.mesh.position.z,0xff5500,35,15,1,7,8);
    FX.ring(c.mesh.position.x,1,c.mesh.position.z,0xff6600,10);
    this.addDNA(20,c.mesh.position.x,2,c.mesh.position.z);
    c.mesh.rotation.y+=1;c.mesh.position.y=0.5;
    // kill driver? spawn screaming human
    if(Math.random()<0.6){const h=this.spawnHuman('civilian',c.mesh.position.x+2,c.mesh.position.z);h.state='flee';h.fear=1;}
    setTimeout(()=>scene.remove(c.mesh),5000);
  },
  explode(x,y,z,radius=12,dmg=120,fromPlayer=true){
    AudioSys.explosion();
    Particles.spawn(x,y,z,0xffdd55,25,16,0.6,8,8);
    Particles.spawn(x,y,z,0xff6600,25,12,1,7,8);
    Particles.spawn(x,y,z,0x333333,20,8,1.6,6,4);
    FX.ring(x,Math.max(0.5,y-1),z,0xffaa00,radius);
    for(const h of this.humans){if(h.dead)continue;const d=h.mesh.position.distanceTo(new THREE.Vector3(x,y,z));if(d<radius)this.damageHuman(h,dmg*(1-d/radius)+20);}
    for(const c of this.cows){if(c.dead)continue;const d=c.mesh.position.distanceTo(new THREE.Vector3(x,y,z));if(d<radius){c.hp-=dmg;if(c.hp<=0){c.dead=true;this.kills++;this.addDNA(15,c.mesh.position.x,2,c.mesh.position.z);Particles.spawn(c.mesh.position.x,1.5,c.mesh.position.z,0xff3355,15,9,0.8,5,8);scene.remove(c.mesh);} }}
    for(const t of this.tanks){if(t.dead)continue;const d=t.mesh.position.distanceTo(new THREE.Vector3(x,y,z));if(d<radius+3)this.damageTank(t,dmg*(1-d/(radius+4))); }
    for(const a of this.aas){if(a.dead)continue;const d=Math.hypot(a.x-x,a.z-z);if(d<radius)this.damageAA(a,dmg);}
    for(const c of this.cars){if(c.dead)continue;const d=c.mesh.position.distanceTo(new THREE.Vector3(x,y,z));if(d<radius)this.explodeCar(c);}
    for(const b of WORLD.buildings){if(b.dead)continue;const d=dist2D(b.x,b.z,x,z);if(d<radius+b.hx*0.5)this.damageBuilding(b,dmg);}
    // hurt player if close (enemy explosions)
    if(!fromPlayer){
      const pp=this.mode==='saucer'?this.saucer.pos:this.player.pos;
      if(Math.hypot(pp.x-x,pp.z-z)<radius&&Math.abs(pp.y-y)<8)this.hurtPlayer(dmg*0.4);
    }
  },
  hurtPlayer(dmg){
    if(this.state!=='playing')return;
    AudioSys.hurt();
    $('vignette').style.opacity=0.9;setTimeout(()=>$('vignette').style.opacity=0,250);
    if(this.mode==='foot'){
      if(this.player.shield>0){this.player.shield-=dmg;if(this.player.shield<0){this.player.hp+=this.player.shield;this.player.shield=0;}}
      else this.player.hp-=dmg;
      if(this.player.hp<=0){
        // auto recall to saucer
        this.player.hp=100;this.player.shield=100;
        this.mode='saucer';this.saucer.pos.set(this.player.pos.x+10,15,this.player.pos.z+10);
        this.feed('Crypto cloned & recalled to saucer! Don\'t die out there.','bad');
        this.hint('You were revived in the saucer. Shields recharging.',4);
        this.updateWeaponUI();
      }
    } else {
      if(this.saucer.shield>0){this.saucer.shield-=dmg*0.7;if(this.saucer.shield<0){this.saucer.hull+=this.saucer.shield;this.saucer.shield=0;}}
      else this.saucer.hull-=dmg*0.7;
      if(this.saucer.hull<=0){this.gameOver();}
    }
  },
  gameOver(){
    if(this.state!=='playing')return;
    this.state='over';this._justDied=true;
    document.exitPointerLock?.();
    $('goStats').textContent=`DNA: ${Math.floor(this.dna)} · Kills: ${this.kills} · Buildings: ${this.buildingsDown} · Survived ${this.fmtTime(this.time)}`;
    $('gameover').classList.remove('hidden');
  },
  victory(){
    if(this.freeRoam||this.state!=='playing')return;
    this.state='won-pause';
    document.exitPointerLock?.();
    $('winStats').textContent=`DNA: ${Math.floor(this.dna)} · Kills: ${this.kills} · Buildings razed: ${this.buildingsDown} · Time: ${this.fmtTime(this.time)} — Furon Empire salutes you, Crypto!`;
    $('victory').classList.remove('hidden');
    this.state='playing'; // allow continue; victory screen overlays
  },
  fmtTime(s){s=Math.floor(s);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;},
  releasePK(){ if(this.pkHeld){this.pkHeld.fly=null;this.pkHeld=null;} },

  // ============ WEAPONS UPDATE ============
  aimPoint(maxDist=220){
    const dir=new THREE.Vector3();camera.getWorldDirection(dir);
    // from camera center
    return {origin:camera.position.clone(),dir:dir.clone(),maxDist};
  },
  raycastHumans(origin,dir,maxDist){
    let best=null,bestD=maxDist;
    const test=(pos,radius,ref)=>{
      const to=pos.clone().sub(origin);const t=to.dot(dir);
      if(t<0||t>maxDist)return null;
      const perp=origin.clone().add(dir.clone().multiplyScalar(t)).distanceTo(pos);
      if(perp<radius+1.2&&t<bestD){bestD=t;best=ref;}
    };
    for(const h of this.humans){if(h.dead)continue;const p=h.mesh.position.clone();p.y+=1.2;test(p,1,h);}
    for(const c of this.cows){if(c.dead)continue;const p=c.mesh.position.clone();p.y+=1;test(p,1.5,c);}
    for(const t of this.tanks){if(t.dead)continue;const p=t.mesh.position.clone();p.y+=1.5;test(p,2.5,t);}
    for(const c of this.cars){if(c.dead)continue;const p=c.mesh.position.clone();p.y+=1;test(p,2,c);}
    for(const a of this.aas){if(a.dead)continue;const p=new THREE.Vector3(a.x,1.5,a.z);test(p,1.5,a);}
    for(const b of WORLD.buildings){if(b.dead)continue;const p=new THREE.Vector3(b.x,4,b.z);test(p,Math.max(b.hx,b.hz),b);}
    return {hit:best,dist:bestD};
  },
  fireZap(){
    if(this.fireCD>0)return;this.fireCD=0.16;AudioSys.zap();
    const {origin,dir}=this.aimPoint();
    const {hit,dist}=this.raycastHumans(origin,dir,70);
    const end=origin.clone().add(dir.clone().multiplyScalar(hit?dist:70));
    const start=this.alien.position.clone();start.y+=1.5;
    // lightning: 2 segments
    FX.beam(start.x,start.y,start.z,(start.x+end.x)/2+rand(-1,1),(start.y+end.y)/2+rand(-1,1),(start.z+end.z)/2+rand(-1,1),0x7dfffa,1.2);
    FX.beam(start.x,start.y,start.z,end.x,end.y,end.z,0xccffff,0.7);
    Particles.spawn(end.x,end.y,end.z,0x7dfffa,6,7,0.4,3,6);
    if(!hit)return;
    if(hit.mesh&&hit.type!==undefined&&hit.hp!==undefined&&this.humans.includes(hit))this.damageHuman(hit,34);
    else if(this.cows.includes(hit)){hit.hp-=34;Particles.spawn(hit.mesh.position.x,1.5,hit.mesh.position.z,0xff3355,8,7,0.5,4,8);if(hit.hp<=0){hit.dead=true;this.kills++;this.addDNA(15,hit.mesh.position.x,2,hit.mesh.position.z);scene.remove(hit.mesh);}}
    else if(this.tanks.includes(hit))this.damageTank(hit,22);
    else if(this.aas.includes(hit))this.damageAA(hit,22);
    else if(this.cars.includes(hit))this.explodeCar(hit);
    else if(hit.isBuilding)this.damageBuilding(hit,30);
  },
  fireDisintegrator(){
    if(this.fireCD>0)return;this.fireCD=0.7;AudioSys.plasma();
    const dir=new THREE.Vector3();camera.getWorldDirection(dir);
    const start=this.alien.position.clone();start.y+=1.6;
    const m=new THREE.Mesh(new THREE.SphereGeometry(0.45,10,10),new THREE.MeshBasicMaterial({color:0x7dfffa}));
    m.position.copy(start);scene.add(m);
    this.projectiles.push({mesh:m,vel:dir.multiplyScalar(38),life:2.5,from:'foot'});
    Particles.spawn(start.x,start.y,start.z,0x7dfffa,6,5,0.4,2,2);
  },
  updatePK(dt){
    // hold RMB with weapon 2
    if(this.weapon!==2||!Input.rmb||this.mode!=='foot'){if(!Input.rmb)this.releaseThrow();else if(this.weapon!==2&&this.pkHeld)this.releasePK();return;}
    if(!this.pkHeld){
      // find grab candidate in front
      const {origin,dir}=this.aimPoint();
      const {hit,dist}=this.raycastHumans(origin,dir,28);
      if(hit&&(this.humans.includes(hit)||this.cows.includes(hit)||this.cars.includes(hit))){
        this.pkHeld=hit;AudioSys.pk();
        if(this.humans.includes(hit)){hit.state='grabbed';}
        this.feed('PK locked — release RMB to hurl!');
      }
    } else {
      AudioSys.abduct();
      // levitate in front of player
      const dir=new THREE.Vector3();camera.getWorldDirection(dir);
      const target=this.alien.position.clone().add(dir.multiplyScalar(6));target.y+=3;
      const hp=this.pkHeld.mesh?this.pkHeld.mesh.position:(this.pkHeld.mesh?.position);
      const mp=this.pkHeld.mesh.position;
      mp.lerp(target,Math.min(1,dt*6));
      mp.y+=Math.sin(performance.now()*0.01)*dt*2;
      Particles.spawn(mp.x,mp.y,mp.z,0xff6bf3,2,3,0.4,1,0);
      $('abductFlash').style.opacity=0.5;
    }
    if(!Input.rmb)$('abductFlash').style.opacity=0;
  },
  releaseThrow(){
    if(this.pkHeld&&Input.rmb===false){
      const h=this.pkHeld;this.pkHeld=null;
      const dir=new THREE.Vector3();camera.getWorldDirection(dir);
      const throwVel={vx:dir.x*35,vy:8,vz:dir.z*35,t:1.2};
      if(this.humans.includes(h)){h.fly=throwVel;h.state='flee';h.hp-=10;if(h.hp<=0)this.damageHuman(h,50);}
      else if(this.cows.includes(h)){h.fly=throwVel;}
      else if(this.cars.includes(h)){
        // turn car into projectile
        this.projectiles.push({mesh:h.mesh,vel:new THREE.Vector3(dir.x*35,10,dir.z*35),life:2,from:'pkcar',car:h});
        const idx=this.cars.indexOf(h);if(idx>=0)this.cars.splice(idx,1);
      }
      AudioSys.noise(0.2,0.4,2000);
      $('abductFlash').style.opacity=0;
    }
    if(!Input.rmb&&!this.pkHeld)$('abductFlash').style.opacity=0;
  },
  fireDeathRay(dt){
    const sPos=this.saucer.pos;
    const dir=new THREE.Vector3();camera.getWorldDirection(dir);
    const aim=sPos.clone().add(dir.clone().multiplyScalar(30));aim.y=Math.max(0.5,aim.y-18);
    // clamp aim near ground in front
    const gun=new THREE.Vector3(sPos.x,sPos.y-0.6,sPos.z);
    FX.beam(gun.x,gun.y,gun.z,aim.x,aim.y,aim.z,0xff2222,2.2);
    FX.beam(gun.x,gun.y,gun.z,aim.x,aim.y,aim.z,0xffaa55,1);
    Particles.spawn(aim.x,aim.y+0.5,aim.z,0xff5500,4,8,0.4,4,6);
    Particles.spawn(aim.x,aim.y+0.3,aim.z,0xff2222,3,6,0.3,3,4);
    if(Math.random()<0.3)AudioSys.zap();
    // AoE damage at aim
    const R=7;
    for(const b of WORLD.buildings){if(b.dead)continue;if(dist2D(b.x,b.z,aim.x,aim.z)<R+b.hx*0.4)this.damageBuilding(b,90*dt*3);}
    for(const t of this.tanks){if(t.dead)continue;if(t.mesh.position.distanceTo(new THREE.Vector3(aim.x,1,aim.z))<R+2)this.damageTank(t,70*dt*3);}
    for(const a of this.aas){if(a.dead)continue;if(Math.hypot(a.x-aim.x,a.z-aim.z)<R)this.damageAA(a,70*dt*3);}
    for(const c of this.cars){if(c.dead)continue;if(c.mesh.position.distanceTo(new THREE.Vector3(aim.x,1,aim.z))<R)this.explodeCar(c);}
    for(const h of this.humans){if(h.dead)continue;if(h.mesh.position.distanceTo(new THREE.Vector3(aim.x,1,aim.z))<R)this.damageHuman(h,120*dt*3);}
    for(const c of this.cows){if(c.dead)continue;if(c.mesh.position.distanceTo(new THREE.Vector3(aim.x,1,aim.z))<R){c.hp-=120*dt*3;if(c.hp<=0&&!c.dead){c.dead=true;this.kills++;this.addDNA(15,c.mesh.position.x,2,c.mesh.position.z);Particles.spawn(c.mesh.position.x,1,c.mesh.position.z,0xff3355,12,8,0.6,5,8);scene.remove(c.mesh);}}}
    // scorch decal: small dark circle? skip
  },
  updateAbduct(dt){
    const sPos=this.saucer.pos;
    const beam=this.saucerMesh.getObjectByName('abductBeam');
    const core=this.saucerMesh.getObjectByName('abductCore');
    let any=false;
    if(this.mode==='saucer'&&Input.rmb){
      beam.material.opacity=lerp(beam.material.opacity,0.5,dt*8);
      if(core)core.material.opacity=lerp(core.material.opacity,0.65,dt*8);
      $('crosshair').classList.add('abduct');
      $('abductFlash').style.opacity=0.6;
      AudioSys.abduct();
      const R=6+ sPos.y*0.04;
      const victims=[];
      for(const h of this.humans){if(h.dead||h.abducted)continue;const d=dist2D(h.mesh.position.x,h.mesh.position.z,sPos.x,sPos.z);if(d<R&&sPos.y<28)victims.push(h);}
      for(const c of this.cows){if(c.dead)continue;const d=dist2D(c.mesh.position.x,c.mesh.position.z,sPos.x,sPos.z);if(d<R&&sPos.y<28)victims.push(c);}
      // lift up to 4 at a time
      for(const v of victims.slice(0,4)){
        any=true;v.abducted=true;
        const mp=v.mesh?v.mesh.position:v.position;
      }
      // apply lift to all in radius
      for(const h of this.humans){
        if(h.dead)continue;const d=dist2D(h.mesh.position.x,h.mesh.position.z,sPos.x,sPos.z);
        if(d<R&&sPos.y<28){h.abducted=true;h.state='abducted';
          h.mesh.position.x=lerp(h.mesh.position.x,sPos.x,dt*1.5);
          h.mesh.position.z=lerp(h.mesh.position.z,sPos.z,dt*1.5);
          h.mesh.position.y+=dt*(10+h.mesh.position.y*0.3);
          h.mesh.rotation.y+=dt*8;
          Particles.spawn(h.mesh.position.x,h.mesh.position.y,h.mesh.position.z,0xb6ff5e,1,2,0.4,1,0);
          if(h.mesh.position.y>=sPos.y-1){
            h.dead=true;this.kills++;scene.remove(h.mesh);
            this.dna+=20;this.addDNA(0,h.mesh.position.x,sPos.y,h.mesh.position.z);
            this.alert=clamp(this.alert+0.1,0,5);
            Particles.spawn(sPos.x,sPos.y-1,sPos.z,0xb6ff5e,15,8,0.7,4,2);
            this.feed('Abducted! +20 DNA (bonus)','good');
          }
        }
      }
      for(const c of this.cows){
        if(c.dead)continue;const d=dist2D(c.mesh.position.x,c.mesh.position.z,sPos.x,sPos.z);
        if(d<R&&sPos.y<28){
          c.mesh.position.x=lerp(c.mesh.position.x,sPos.x,dt*1.5);
          c.mesh.position.z=lerp(c.mesh.position.z,sPos.z,dt*1.5);
          c.mesh.position.y+=dt*9;c.mesh.rotation.z+=dt*3;
          if(c.mesh.position.y>=sPos.y-1){c.dead=true;this.kills++;scene.remove(c.mesh);this.dna+=25;this.addDNA(0,sPos.x,sPos.y,sPos.z);this.feed('Cow abducted! +25 DNA','good');}
        }
      }
    } else {
      beam.material.opacity=lerp(beam.material.opacity,0,dt*8);
      if(core)core.material.opacity=lerp(core.material.opacity,0,dt*8);
      $('crosshair').classList.remove('abduct');
      if(!Input.lmb)$('abductFlash').style.opacity=0;
      // reset abducted flags for those not consumed
      for(const h of this.humans){if(h.abducted&&!h.dead&&h.state==='abducted'){h.abducted=false;h.state='flee';h.fear=1;h.mesh.position.y=Math.max(0,h.mesh.position.y-20*dt);if(h.mesh.position.y<=0.1){h.mesh.position.y=0;h.abducted=false;}}}
    }
    if(!any&&!(this.mode==='saucer'&&Input.rmb)){}
  },

  // ============ UPDATES ============
  updatePlayer(dt){
    const P=this.player,S=this.saucer;
    // look
    P.yaw-=Input.mdx*0.0026;P.pitch-=Input.mdy*0.0022;P.pitch=clamp(P.pitch,-1.2,0.9);
    S.yaw-=Input.mdx*0.0022;
    Input.mdx=0;Input.mdy=0;
    this.fireCD-=dt;this.shockCD-=dt;
    if(this.mode==='foot'){
      const speed=(Input.keys['ShiftLeft']||Input.keys['ShiftRight'])?9:5.2;
      let fx=0,fz=0;
      if(Input.keys['KeyW'])fz-=1;if(Input.keys['KeyS'])fz+=1;
      if(Input.keys['KeyA'])fx-=1;if(Input.keys['KeyD'])fx+=1;
      const sin=Math.sin(P.yaw),cos=Math.cos(P.yaw);
      let mx=(fx*cos-fz*sin),mz=(-fx*sin-fz*cos);
      // note: yaw convention adjusted for camera
      mx=(fx*Math.cos(P.yaw)-fz*Math.sin(P.yaw));
      mz=(fx*Math.sin(P.yaw)+fz*Math.cos(P.yaw));
      // Actually compute forward = (-sin(yaw), -cos(yaw))? Let's define forward from yaw:
      const fwdX=-Math.sin(P.yaw),fwdZ=-Math.cos(P.yaw);
      const rightX=Math.cos(P.yaw),rightZ=-Math.sin(P.yaw);
      mx=fwdX*(-fz)+rightX*(fx); // fz=-1 forward => -fz=1
      mz=fwdZ*(-fz)+rightZ*(fx);
      const len=Math.hypot(mx,mz)||1; if(fx||fz){mx/=len;mz/=len;}else{mx=0;mz=0;}
      // smooth
      P.pos.x+=mx*speed*dt;P.pos.z+=mz*speed*dt;
      const col=collides(P.pos.x,P.pos.z,0.7);
      if(col){P.pos.x-=mx*speed*dt;P.pos.z-=mz*speed*dt;}
      // jump / jetpack
      const wantJet=Input.keys['Space'];
      if(P.onGround&&wantJet&&P.fuel>5){P.vy=7;P.onGround=false;}
      if(!P.onGround){
        if(wantJet&&P.fuel>0){P.vy+=22*dt;P.fuel-=28*dt;this.alien.getObjectByName('flame').visible=true;
          Particles.spawn(P.pos.x,0.5,P.pos.z,0x33ccff,2,4,0.4,1,2);}
        else this.alien.getObjectByName('flame').visible=false;
        P.vy-=22*dt;P.fuel=clamp(P.fuel+ (wantJet?0:12*dt),0,100);
        P.pos.y+=P.vy*dt;
        if(P.pos.y<=0){P.pos.y=0;P.vy=0;P.onGround=true;}
      } else {P.fuel=clamp(P.fuel+20*dt,0,100);this.alien.getObjectByName('flame').visible=false;}
      P.pos.y=Math.max(0,P.pos.y);
      this.alien.position.copy(P.pos);
      this.alien.rotation.y=P.yaw+Math.PI;
      // walk bob
      if(fx||fz){this.alien.position.y+=Math.abs(Math.sin(performance.now()*0.012))*0.08;}
      // regen
      P.shield=clamp(P.shield+10*dt,0,100);
      // weapons
      if(Input.lmb&&Input.locked){
        if(this.weapon===0)this.fireZap();
        else if(this.weapon===1)this.fireDisintegrator();
      }
      this.updatePK(dt);this.releaseThrow();
      // saucer idle hover
      this.saucerMesh.position.copy(S.pos);
      this.saucerMesh.position.y=S.pos.y+Math.sin(performance.now()*0.002)*0.3;
      // camera third person (over-shoulder, head doesn't block crosshair)
      const cd=8.5;
      const rX=Math.cos(P.yaw),rZ=-Math.sin(P.yaw);
      const cx=P.pos.x+Math.sin(P.yaw)*Math.cos(P.pitch)*cd+rX*1.4;
      const cz=P.pos.z+Math.cos(P.yaw)*Math.cos(P.pitch)*cd+rZ*1.4;
      const cy=P.pos.y+2.6+Math.sin(-P.pitch)*cd*0.9+1.2;
      camera.position.lerp(new THREE.Vector3(cx,Math.max(1.2,cy),cz),Math.min(1,dt*10));
      const look=new THREE.Vector3(P.pos.x,P.pos.y+1.8,P.pos.z);
      // aim ahead
      const fwd=new THREE.Vector3(-Math.sin(P.yaw),0,-Math.cos(P.yaw));
      camera.lookAt(look.clone().add(fwd.multiplyScalar(6)).add(new THREE.Vector3(0,P.pitch*-8,0)));
      // rotate camera to match yaw/pitch exactly for aiming: use lookAt target computed from yaw/pitch
      const aimDir=new THREE.Vector3(-Math.sin(P.yaw)*Math.cos(P.pitch),Math.sin(P.pitch)+0.08,-Math.cos(P.yaw)*Math.cos(P.pitch));
      camera.lookAt(camera.position.clone().add(aimDir.multiplyScalar(10)));
      $('modeLabel').textContent='👽 CRYPTO (on foot)';
    } else {
      // SAUCER
      const boost=(Input.keys['ShiftLeft']||Input.keys['ShiftRight'])?2.2:1;
      const spd=26*boost;
      const fwdX=-Math.sin(S.yaw),fwdZ=-Math.cos(S.yaw);
      const rightX=Math.cos(S.yaw),rightZ=-Math.sin(S.yaw);
      let ix=0,iz=0;
      if(Input.keys['KeyW']){ix+=fwdX;iz+=fwdZ;}if(Input.keys['KeyS']){ix-=fwdX;iz-=fwdZ;}
      if(Input.keys['KeyD']){ix+=rightX;iz+=rightZ;}if(Input.keys['KeyA']){ix-=rightX;iz-=rightZ;}
      S.vel.x=lerp(S.vel.x,ix*spd,Math.min(1,dt*4));
      S.vel.z=lerp(S.vel.z,iz*spd,Math.min(1,dt*4));
      if(Input.keys['Space'])S.vel.y=lerp(S.vel.y,14*boost,dt*4);
      else if(Input.keys['KeyC'])S.vel.y=lerp(S.vel.y,-16,dt*4);
      else S.vel.y=lerp(S.vel.y,0,dt*3);
      S.pos.addScaledVector(S.vel,dt);
      S.pos.x=clamp(S.pos.x,-225,225);S.pos.z=clamp(S.pos.z,-225,225);
      S.pos.y=clamp(S.pos.y,2.5,80);
      // don't clip through tall buildings — glide over rooftops
      for(const b of WORLD.buildings){
        if(b.dead)continue;
        if(Math.abs(S.pos.x-b.x)<b.hx+3&&Math.abs(S.pos.z-b.z)<b.hz+3){
          const minY=b.name==='Town Hall'||b.name==='Command Bunker'?17:13;
          if(S.pos.y<minY)S.pos.y=lerp(S.pos.y,minY,Math.min(1,dt*5));
        }
      }
      // tilt
      this.saucerMesh.position.copy(S.pos);
      this.saucerMesh.rotation.y=S.yaw;
      this.saucerMesh.rotation.z=lerp(this.saucerMesh.rotation.z,-S.vel.x*0.004,dt*5);
      this.saucerMesh.rotation.x=lerp(this.saucerMesh.rotation.x,S.vel.z*0.004*Math.cos(S.yaw),dt*5);
      // lights spin
      const t=performance.now()*0.004;
      this.saucerMesh.userData.lights.forEach((l,i)=>{l.material.color.setHex((Math.floor(t+i)%2)?0xff3355:0x7dfffa);});
      this.saucerMesh.getObjectByName('rim').rotation.z+=dt*2;
      S.shield=clamp(S.shield+8*dt,0,200);
      if(Input.lmb&&Input.locked)this.fireDeathRay(dt);
      this.updateAbduct(dt);
      // alien hidden inside? place alien at saucer
      this.alien.position.copy(S.pos);this.alien.visible=false;
      // camera chase + aim with pitch from mouse? use saucer yaw + player pitch
      P.pitch=clamp(P.pitch,-1,0.6);
      const back=16,up=7+P.pitch*-6;
      const cx=S.pos.x+Math.sin(S.yaw)*back;
      const cz=S.pos.z+Math.cos(S.yaw)*back;
      camera.position.lerp(new THREE.Vector3(cx,S.pos.y+up,cz),Math.min(1,dt*6));
      const aimDir=new THREE.Vector3(-Math.sin(S.yaw)*Math.cos(P.pitch),P.pitch,-Math.cos(S.yaw)*Math.cos(P.pitch));
      camera.lookAt(camera.position.clone().add(aimDir.multiplyScalar(20)));
      $('modeLabel').textContent='🛸 SAUCER';
      if(this.mode==='foot')this.alien.visible=true;
    }
    if(this.mode==='foot')this.alien.visible=true;
    // saucer beacon marker when on foot
    this.updateBeacon();
  },
  _beacon:null,
  updateBeacon(){
    if(!this._beacon){
      const m=new THREE.Mesh(new THREE.CylinderGeometry(1,1,30,10,1,true),new THREE.MeshBasicMaterial({color:0x7CFC00,transparent:true,opacity:0.35,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
      scene.add(m);this._beacon=m;
    }
    this._beacon.position.set(this.saucer.pos.x,this.saucer.pos.y+10,this.saucer.pos.z);
    this._beacon.visible=(this.mode==='foot');
    this._beacon.rotation.y+=0.02;
  },
  updateAI(dt){
    const pp=this.mode==='saucer'?this.saucer.pos:new THREE.Vector3(this.player.pos.x,this.player.pos.y+1,this.player.pos.z);
    const saucerFlying=this.mode==='saucer';
    // humans
    for(const h of this.humans){
      if(h.dead)continue;
      const m=h.mesh;
      if(h.fly){
        h.fly.t-=dt;m.position.x+=h.fly.vx*dt;m.position.y+=h.fly.vy*dt;m.position.z+=h.fly.vz*dt;
        h.fly.vy-=20*dt;m.rotation.x+=dt*6;
        if(m.position.y<=0){m.position.y=0;
          if(h.fly.vx*h.fly.vx>100){this.damageHuman(h,80);} 
          h.fly=null;m.rotation.x=h.dead?-Math.PI/2:0;}
        continue;
      }
      if(h.state==='abducted'||h.state==='grabbed')continue;
      const d=dist2D(m.position.x,m.position.z,pp.x,pp.z);
      // fear
      if(d<18||h.fear>0.5)h.state=(['soldier','cop','agent','commander'].includes(h.type))?'attack':'flee';
      else if(h.state==='flee'&&d>40){h.state='wander';h.fear=0;}
      h.fear=Math.max(0,h.fear-dt*0.2);
      if(h.state==='wander'){
        h.wanderT-=dt;
        if(h.wanderT<=0){h.dir=rand(0,Math.PI*2);h.wanderT=rand(1,4);}
        const nx=m.position.x+Math.cos(h.dir)*h.speed*dt;
        const nz=m.position.z+Math.sin(h.dir)*h.speed*dt;
        if(!collides(nx,nz,0.5)){m.position.x=nx;m.position.z=nz;}
        else h.dir=rand(0,Math.PI*2);
        m.rotation.y=-h.dir+Math.PI/2;
        // idle bob
      } else if(h.state==='flee'){
        const dx=m.position.x-pp.x,dz=m.position.z-pp.z;
        const l=Math.hypot(dx,dz)||1;
        const sp=h.speed*2.2;
        const nx=m.position.x+dx/l*sp*dt,nz=m.position.z+dz/l*sp*dt;
        if(!collides(nx,nz,0.5)){m.position.x=nx;m.position.z=nz;}
        m.rotation.y=Math.atan2(dx,dz);
        // panic particles
        if(Math.random()<dt*2)Particles.spawn(m.position.x,2.2,m.position.z,0xffffff,1,2,0.4,2,0);
      } else if(h.state==='attack'){
        // move toward player if far, shoot if in range
        const dx=pp.x-m.position.x,dz=pp.z-m.position.z;
        const dd=Math.hypot(dx,dz);
        const inRange=saucerFlying?dd<70:dd<38;
        if(dd>(saucerFlying?35:14)){
          const sp=h.type==='commander'?5:4.5;
          const nx=m.position.x+dx/dd*sp*dt,nz=m.position.z+dz/dd*sp*dt;
          if(!collides(nx,nz,0.5)){m.position.x=nx;m.position.z=nz;}
        }
        m.rotation.y=Math.atan2(dx,dz);
        h.shootCD-=dt;
        const dmgScale=h.type==='commander'?3:h.type==='agent'?1.6:1;
        if(h.shootCD<=0&&inRange){
          h.shootCD=h.type==='commander'?0.35:rand(0.7,1.6);
          // tracer
          const from=m.position.clone();from.y+=1.4;
          const to=pp.clone();
          FX.beam(from.x,from.y,from.z,to.x,to.y,to.z,h.type==='commander'?0xff00ff:0xffee55,0.5);
          AudioSys.blip(900,0.08,'square',0.12,-300);
          // hit chance
          const hitChance=saucerFlying?0.35:0.55;
          if(Math.random()<hitChance){
            const flyingHigh=saucerFlying&&this.saucer.pos.y>30;
            this.hurtPlayer((flyingHigh?4:8)*dmgScale);
          }
          Particles.spawn(to.x,to.y,to.z,0xffee55,2,4,0.3,2,4);
        }
      }
    }
    // cows wander
    for(const c of this.cows){
      if(c.dead)continue;
      if(c.fly){c.mesh.position.x+=c.fly.vx*dt;c.mesh.position.y+=c.fly.vy*dt;c.mesh.position.z+=c.fly.vz*dt;c.fly.vy-=15*dt;c.fly.t-=dt;
        if(c.mesh.position.y<=0){c.mesh.position.y=0;c.fly=null;}continue;}
      // abducted handled elsewhere (y rising) - skip if high
      if(c.mesh.position.y>0.5)continue;
      c.t-=dt;if(c.t<=0){c.dir=rand(0,6);c.t=rand(2,5);}
      const nx=c.mesh.position.x+Math.cos(c.dir)*1.5*dt,nz=c.mesh.position.z+Math.sin(c.dir)*1.5*dt;
      if(Math.abs(nx)<70&&nz>108&&nz<192){c.mesh.position.x=nx;c.mesh.position.z=nz;}
      else c.dir=rand(0,6);
      c.mesh.rotation.y=-c.dir;
    }
    // cars
    for(const c of this.cars){
      if(c.dead)continue;
      const m=c.mesh;
      if(c.horiz){m.position.x+=c.speed*dt;if(m.position.x>215||m.position.x<-215)c.speed*=-1;m.rotation.y=c.speed>0?0:Math.PI;}
      else{m.position.z+=c.speed*dt;if(m.position.z>115||m.position.z<-215)c.speed*=-1;m.rotation.y=c.speed>0?Math.PI/2:-Math.PI/2;}
      // run over humans? explode on hitting saucer low or player
      if(this.mode==='foot'){
        if(dist2D(m.position.x,m.position.z,this.player.pos.x,this.player.pos.z)<2&&this.player.pos.y<1.5){
          this.hurtPlayer(15);AudioSys.noise(0.2,0.4,800);
          Particles.spawn(m.position.x,1,m.position.z,0xffaa00,10,8,0.5,4,6);
        }
      }
    }
    // tanks chase
    for(const t of this.tanks){
      if(t.dead)continue;
      const m=t.mesh;
      const dx=pp.x-m.position.x,dz=pp.z-m.position.z;
      const dd=Math.hypot(dx,dz);
      if(dd>12){
        const sp=t.speed;
        const nx=m.position.x+dx/dd*sp*dt,nz=m.position.z+dz/dd*sp*dt;
        // tanks crush through? avoid buildings
        if(!collides(nx,nz,2)){m.position.x=nx;m.position.z=nz;}
      }
      m.rotation.y=Math.atan2(dx,dz)-Math.PI/2;
      const turret=m.getObjectByName('turret');if(turret)turret.rotation.y=Math.atan2(dx,dz)-m.rotation.y-Math.PI/2;
      t.shootCD-=dt;
      const range=saucerFlying?90:50;
      if(t.shootCD<=0&&dd<range){
        t.shootCD=rand(2,3.5);
        const from=m.position.clone();from.y+=2.5;
        const target=pp.clone();
        // shell projectile
        const shell=new THREE.Mesh(new THREE.SphereGeometry(0.35,8,8),new THREE.MeshBasicMaterial({color:0xffaa00}));
        shell.position.copy(from);scene.add(shell);
        const dir=target.clone().sub(from).normalize().multiplyScalar(30);dir.y+=4;
        this.projectiles.push({mesh:shell,vel:dir,life:3,from:'enemy',dmg:22});
        AudioSys.blip(150,0.3,'sawtooth',0.3,-80);
        FX.beam(from.x,from.y,from.z,from.x+dx*0.1,from.y,from.z+dz*0.1,0xffee55,1);
      }
    }
    // AA
    for(const a of this.aas){
      if(a.dead)continue;
      a.shootCD-=dt;
      const gun=a.mesh.getObjectByName('gun');
      if(saucerFlying){
        const d=Math.hypot(a.x-this.saucer.pos.x,a.z-this.saucer.pos.z);
        if(gun){gun.lookAt(this.saucer.pos); }
        if(a.shootCD<=0&&d<110){
          a.shootCD=rand(0.8,1.6);
          // flak burst near saucer
          const sx=this.saucer.pos.x+rand(-6,6),sy=this.saucer.pos.y+rand(-3,3),sz=this.saucer.pos.z+rand(-6,6);
          FX.beam(a.x,2.5,a.z,sx,sy,sz,0xffee55,0.6);
          AudioSys.blip(500,0.15,'square',0.2,-200);
          setTimeout(()=>{ if(this.mode==='saucer'&&Math.hypot(a.x-this.saucer.pos.x,a.z-this.saucer.pos.z)<14){this.hurtPlayer(rand(8,18));Particles.spawn(this.saucer.pos.x,this.saucer.pos.y,this.saucer.pos.z,0xffaa00,10,10,0.5,3,6);} },350);
          Particles.spawn(sx,sy,sz,0xffee55,6,6,0.4,2,2);
        }
      }
    }
    // projectiles
    for(let i=this.projectiles.length-1;i>=0;i--){
      const p=this.projectiles[i];
      p.life-=dt;p.vel.y-=p.from==='enemy'?12*dt:6*dt;
      p.mesh.position.addScaledVector(p.vel,dt);
      const mp=p.mesh.position;
      let hit=false;
      if(p.from==='foot'){
        // check world hit
        for(const h of this.humans){if(h.dead)continue;if(h.mesh.position.distanceTo(mp)<2.2){this.damageHuman(h,80);hit=true;break;}}
        if(!hit)for(const t of this.tanks){if(t.dead)continue;if(t.mesh.position.distanceTo(mp)<3.5){this.damageTank(t,90);hit=true;break;}}
        if(!hit)for(const b of WORLD.buildings){if(b.dead)continue;if(Math.abs(mp.x-b.x)<b.hx+1&&Math.abs(mp.z-b.z)<b.hz+1&&mp.y<12){this.damageBuilding(b,90);hit=true;break;}}
        if(!hit)for(const c of this.cars){if(c.dead)continue;if(c.mesh.position.distanceTo(mp)<3){this.explodeCar(c);hit=true;break;}}
        if(mp.y<=0.2||p.life<=0)hit=true;
        if(hit){this.explode(mp.x,Math.max(0.5,mp.y),mp.z,9,90,true);scene.remove(p.mesh);this.projectiles.splice(i,1);continue;}
        // trail
        if(Math.random()<0.6)Particles.spawn(mp.x,mp.y,mp.z,0x7dfffa,1,1,0.3,0,0);
      } else if(p.from==='enemy'){
        const tpp=this.mode==='saucer'?this.saucer.pos:new THREE.Vector3(this.player.pos.x,this.player.pos.y+1,this.player.pos.z);
        if(mp.distanceTo(tpp)<(this.mode==='saucer'?4.5:1.8)){this.hurtPlayer(p.dmg||15);Particles.spawn(mp.x,mp.y,mp.z,0xff5500,10,8,0.5,4,6);scene.remove(p.mesh);this.projectiles.splice(i,1);continue;}
        if(mp.y<=0.1){this.explode(mp.x,0.5,mp.z,7,30,false);scene.remove(p.mesh);this.projectiles.splice(i,1);continue;}
        if(p.life<=0){scene.remove(p.mesh);this.projectiles.splice(i,1);continue;}
      } else if(p.from==='pkcar'){
        // flying car damages everything on landing
        if(mp.y<=0.5||p.life<=0){
          const car=p.car;
          // re-add as wreck? just explode
          AudioSys.explosion();
          this.explode(mp.x,1,mp.z,11,110,true);
          scene.remove(p.mesh);this.projectiles.splice(i,1);continue;
        }
      }
    }
    // thrown humans landing damage
    // DNA orbs? we directly add, skip
    // maintain populations + difficulty
    this.director(dt);
  },
  director(dt){
    // alert decay
    this.alertDecay+=dt;
    if(this.alertDecay>6){this.alertDecay=0;this.alert=clamp(this.alert-0.15,0,5);}
    const aliveCiv=this.humans.filter(h=>!h.dead&&['civilian','farmer'].includes(h.type)).length;
    if(aliveCiv<18&&this.humans.length<60){for(let i=0;i<3;i++)this.spawnHuman(Math.random()<0.8?'civilian':'farmer');}
    const wantSoldiers=this.mission>=1?Math.floor(this.alert*2.5)+(this.mission>=2?3:0):0;
    const aliveSold=this.humans.filter(h=>!h.dead&&['soldier','cop','agent'].includes(h.type)).length;
    if(aliveSold<wantSoldiers&&Math.random()<dt*1.2)this.spawnSoldier();
    const aliveTanks=this.tanks.filter(t=>!t.dead).length;
    const wantTanks=this.mission>=1?(this.alert>1.5?2:0)+(this.mission>=2?2:0):0;
    if(aliveTanks<wantTanks&&Math.random()<dt*0.3&&this.tanks.length<8)this.spawnTank();
    if(this.mission===1&&this.armorKills===0&&this.troopKills>2&&aliveTanks===0)this.spawnTank();
    // cows respawn
    if(this.cows.filter(c=>!c.dead).length<5&&Math.random()<dt*0.5)this.spawnCow();
    if(this.cars.filter(c=>!c.dead).length<3&&Math.random()<dt*0.3)this.spawnCar();
    // mission progression checks
    this.checkMissions();
  },
  checkMissions(){
    if(this.freeRoam)return;
    if(this.mission===0&&this.dna>=800){
      this.mission=1;this.showBrief('Mission 1 Complete — DNA secured!','ARMY CRACKDOWN','The monkeys send their Army. Destroy 6 armor (tanks/AA) and 12 troops. Your saucer Death Ray melts armor. Shockwave (Q) is your friend.');
      this.alert=Math.max(this.alert,2);
      for(let i=0;i<3;i++){this.spawnTank();this.spawnSoldier();this.spawnSoldier();}
      AudioSys.alarm();
    } else if(this.mission===1&&this.armorKills>=6&&this.troopKills>=12){
      this.mission=2;this.showBrief('Army Broken!','FINAL PHASE: ANNIHILATION','Raze 18 buildings, then face Majestic Commander Black at Town Hall. No survivors. No mercy.');
      this.spawnBoss();
      this.alert=5;
      for(let i=0;i<2;i++)this.spawnTank();
    } else if(this.mission===2){
      if(this.buildingsDown>=10&&!this.bossSpawned)this.spawnBoss();
      if(this.buildingsDown>=18&&this.boss&&this.boss.dead){
        this.freeRoam=true;this.victory();
      }
    }
  },
  showBrief(kicker,title,desc){
    this.state='brief-pause';
    $('bKicker').textContent=kicker;$('bTitle').textContent=title;$('bDesc').textContent=desc;
    $('brief').classList.remove('hidden');
    document.exitPointerLock?.();
    // auto set state playing on deploy; keep world running paused? pause updates while brief open
    const btn=$('briefBtn');
    btn.onclick=()=>{AudioSys.ui();$('brief').classList.add('hidden');this.state='playing';renderer.domElement.requestPointerLock?.();};
  },

  // ============ HUD ============
  updateHUD(dt){
    $('dnaVal').textContent=Math.floor(this.dna);
    $('killVal').textContent=this.kills;
    $('timeVal').textContent=this.fmtTime(this.time);
    const lvl=Math.round(this.alert);
    $('alertVal').textContent='★'.repeat(lvl)+'☆'.repeat(5-lvl);
    $('alertVal').style.color=lvl>=4?'#ff2e63':lvl>=2?'#ffb02e':'#8be9d9';
    // mission
    const m=this.missions[Math.min(this.mission,2)];
    $('mName').textContent=this.freeRoam?'FREE ROAM — Rockwell is yours':m.name;
    $('mTitle').textContent=this.freeRoam?'Keep harvesting!':m.title;
    let desc=m.desc,prog=0;
    if(this.freeRoam){desc=`DNA ${Math.floor(this.dna)} · Kills ${this.kills} · Buildings ${this.buildingsDown}. Saucer + Crypto at your disposal.`;prog=1;}
    else if(this.mission===0){desc=`DNA ${Math.floor(this.dna)} / 800 — abduct (2×) or vaporize. Cows = easy DNA.`;prog=this.dna/800;}
    else if(this.mission===1){desc=`Armor ${Math.min(6,this.armorKills)}/6 · Troops ${Math.min(12,this.troopKills)}/12`;prog=(Math.min(6,this.armorKills)+Math.min(12,this.troopKills))/18;}
    else{const bd=Math.min(18,this.buildingsDown);const boss=this.boss?(this.boss.dead?'Commander: DEAD':'Commander: ALIVE — Town Hall!'):'Commander: emerges at 10 razed';desc=`Razed ${bd}/18 · ${boss}`;prog=(bd+(this.boss&&this.boss.dead?4:0))/22;}
    $('mDesc').textContent=desc;$('mProg').style.width=`${clamp(prog*100,0,100)}%`;
    // bars
    const hp=this.mode==='foot'?this.player.hp:this.saucer.hull/2;
    const sh=this.mode==='foot'?this.player.shield:this.saucer.shield/2;
    const fu=this.mode==='foot'?this.player.fuel:Math.max(0,6-this.shockCD)/6*100;
    $('hp').firstElementChild.style.width=`${clamp(hp,0,100)}%`;
    $('sh').firstElementChild.style.width=`${clamp(sh,0,100)}%`;
    $('fuel').firstElementChild.style.width=`${clamp(fu,0,100)}%`;
    $('hpTxt').textContent=`${Math.ceil(this.mode==='foot'?this.player.hp:this.saucer.hull)}`;
    $('shTxt').textContent=`${Math.ceil(this.mode==='foot'?this.player.shield:this.saucer.shield)}`;
    $('fuelLabel').textContent=this.mode==='foot'?'JETPACK':`SHOCKWAVE ${this.shockCD>0?Math.ceil(this.shockCD)+'s':'READY'}`;
    const pp=this.mode==='saucer'?this.saucer.pos:this.player.pos;
    $('posLabel').textContent=`${Math.round(pp.x)}, ${Math.round(pp.z)}`;
    this.updateWeaponUI2();
    this.drawMinimap();
  },
  updateWeaponUI2(){
    if(this.mode==='saucer'){
      $('w0').innerHTML='<b>🛸 Death Ray</b><span>LMB — melt</span>';$('w0').classList.add('active');
      $('w1').innerHTML='<b>🌀 Abducto-Beam</b><span>hold RMB — suck up</span>';$('w1').classList.toggle('active',Input.rmb);
      $('w2').innerHTML='<b>💥 Repulse (Q)</b><span>shockwave</span>';$('w2').classList.toggle('active',this.shockCD<=0);
    } else {
      $('w0').innerHTML='<b>1 · Zap-O-Matic</b><span>LMB — lightning</span>';
      $('w1').innerHTML='<b>2 · Disintegrator</b><span>LMB — plasma orb</span>';
      $('w2').innerHTML='<b>3 · Psychokinesis</b><span>RMB hold — lift & throw</span>';
      for(let i=0;i<3;i++)$('w'+i).classList.toggle('active',i===this.weapon);
    }
  },
  drawMinimap(){
    const c=$('minimap'),ctx=c.getContext('2d');
    ctx.clearRect(0,0,170,170);
    ctx.fillStyle='#06141a';ctx.fillRect(0,0,170,170);
    const s=v=>(v+230)/460*170;
    // roads
    ctx.strokeStyle='#2a343c';ctx.lineWidth=3;
    for(const r of WORLD.roads){ctx.beginPath();ctx.moveTo(s(r),0);ctx.lineTo(s(r),170);ctx.stroke();ctx.beginPath();ctx.moveTo(0,s(r));ctx.lineTo(170,s(r));ctx.stroke();}
    // buildings
    ctx.fillStyle='#5a6a7a';
    for(const b of WORLD.buildings){if(b.dead)continue;ctx.fillRect(s(b.x)-2,s(b.z)-2,4,4);}
    // military
    ctx.fillStyle='#ff2e63';ctx.fillRect(s(140)-4,s(-140)-4,8,8);
    // cows pasture
    ctx.fillStyle='#4a7a3a';ctx.fillRect(s(-70),s(108),s(70)-s(-70),s(192)-s(108));
    // humans
    ctx.fillStyle='#ffe9a8';
    for(const h of this.humans){if(h.dead)continue;ctx.fillRect(s(h.mesh.position.x)-1,s(h.mesh.position.z)-1,2,2);}
    // tanks
    ctx.fillStyle='#ff8800';
    for(const t of this.tanks){if(t.dead)continue;ctx.fillRect(s(t.mesh.position.x)-2,s(t.mesh.position.z)-2,4,4);}
    // saucer + player
    const pp=this.mode==='saucer'?this.saucer.pos:this.player.pos;
    // saucer
    ctx.fillStyle='#00ffcc';ctx.beginPath();ctx.arc(s(this.saucer.pos.x),s(this.saucer.pos.z),4,0,7);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s(pp.x),s(pp.z),2.5,0,7);ctx.fill();
    // view dir
    ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(s(pp.x),s(pp.z));
    const yaw=this.mode==='saucer'?this.saucer.yaw:this.player.yaw;
    ctx.lineTo(s(pp.x)-Math.sin(yaw)*12,s(pp.z)-Math.cos(yaw)*12);ctx.stroke();
    // north
    ctx.fillStyle='#8be9d9';ctx.font='10px monospace';ctx.fillText('N',80,12);
  },

  // ============ LOOP ============
  last:0,
  loop(t){
    requestAnimationFrame(tt=>this.loop(tt));
    const dt=Math.min(0.05,(t-this.last)/1000||0.016);this.last=t;
    const paused=this.paused||this.state==='menu'||this.state==='over'||this.state==='brief-pause'||!$('brief').classList.contains('hidden')&&!this.freeRoam&&this.state!=='playing';
    const briefOpen=!$('brief').classList.contains('hidden');
    if(this.state==='playing'&&!this.paused&&!briefOpen){
      this.time+=dt;
      if(Input.keys['KeyP']&&!this._pHeld){this._pHeld=true;this.togglePause();} 
      this.updatePlayer(dt);
      this.updateAI(dt);
      Particles.update(dt);FX.update(dt);HD.update(dt);
      this.updateHUD(dt);
      $('fps').textContent=`${Math.round(1/Math.max(dt,0.001))} fps · ${this.humans.filter(h=>!h.dead).length} humans · mode ${this.mode}`;
    } else {
      if(Input.keys['KeyP']&&!this._pHeld){this._pHeld=true;if(this.state==='playing')this.togglePause();}
      // still render menu background orbit
      if(this.state==='menu'){
        const tt=t*0.0002;
        camera.position.set(Math.sin(tt)*120,60,Math.cos(tt)*120);
        camera.lookAt(0,0,0);
        Particles.update(dt);FX.update(dt);HD.update(dt);
        // idle saucer anim
        this.saucerMesh.position.set(0,18+Math.sin(t*0.002)*2,160);
        this.saucerMesh.rotation.y+=dt*0.5;
        this.alien.position.set(0,0,150);
      }
    }
    if(!Input.keys['KeyP'])this._pHeld=false;
    // Esc pause
    if(this._escListener!==true){this._escListener=true;
      addEventListener('keydown',e=>{if(e.code==='Escape'&&this.state==='playing'&&$('brief').classList.contains('hidden'))this.togglePause();});
    }
    renderer.render(scene,camera);
  }
};

Game.init();
window.Game=Game;

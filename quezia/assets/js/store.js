/* Camada de dados: Supabase (real) ou armazenamento local (demonstração). */
(function(){
const C=window.QS_CONFIG||{};
const REMOTE=!!(C.supabaseUrl&&C.supabaseKey);
const SEED=window.QS_SEED;
const uid=(p='id')=>p+'-'+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);
const clone=o=>JSON.parse(JSON.stringify(o));

/* ---------- local (IndexedDB) ---------- */
let db=null;
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('qs-local',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function loadLocal(){
  if(db)return db;
  try{const d=await idb();db=await new Promise(res=>{const q=d.transaction('kv').objectStore('kv').get('db');q.onsuccess=()=>res(q.result);q.onerror=()=>res(null)})}catch(e){db=null}
  if(!db){db={props:clone(SEED.props),secrets:clone(SEED.secrets),videos:clone(SEED.videos),leads:[],settings:clone(SEED.settings),auth:null}}
  return db;
}
async function saveLocal(){
  try{const d=await idb();await new Promise((res,rej)=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(db,'db');t.oncomplete=res;t.onerror=()=>rej(t.error)})}catch(e){console.warn('save local',e)}
}
async function hashPw(pw,salt){
  const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
  const b=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'},k,256);
  return btoa(String.fromCharCode(...new Uint8Array(b)));
}

/* ---------- remoto (Supabase) ---------- */
const SK='qs-session';
const sess=()=>{try{return JSON.parse(localStorage.getItem(SK)||'null')}catch(e){return null}};
const setSess=s=>{try{s?localStorage.setItem(SK,JSON.stringify(s)):localStorage.removeItem(SK)}catch(e){}};
async function fresh(){
  const s=sess();if(!s)return;
  if(s.expires_at-Date.now()/1000>60)return;
  try{
    const r=await fetch(C.supabaseUrl+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:C.supabaseKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});
    if(!r.ok)throw 0;const j=await r.json();setSess(pack(j));
  }catch(e){setSess(null)}
}
const pack=j=>({access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Math.floor(Date.now()/1000)+(j.expires_in||3600),email:(j.user&&j.user.email)||''});
const hdr=(x={})=>({apikey:C.supabaseKey,Authorization:'Bearer '+((sess()||{}).access_token||C.supabaseKey),'Content-Type':'application/json',...x});
async function rest(path,o={}){
  await fresh();
  const r=await fetch(C.supabaseUrl+'/rest/v1/'+path,{...o,headers:hdr(o.headers)});
  if(!r.ok)throw new Error((await r.text())||r.status);
  const t=await r.text();return t?JSON.parse(t):null;
}
const up=(table,row)=>rest(table,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(row)});

/* ---------- imagem ---------- */
function resize(file,{max=1600,blur=0,q=.82}={}){
  return new Promise((res,rej)=>{
    const im=new Image(),u=URL.createObjectURL(file);
    im.onload=()=>{
      const k=Math.min(1,max/Math.max(im.width,im.height));
      const c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
      const x=c.getContext('2d');x.imageSmoothingQuality='high';
      if(blur){ // desfoque forte e irreversível: encolhe para ~28px e amplia (funciona em qualquer navegador)
        const s=document.createElement('canvas'),r=28/Math.max(c.width,c.height);s.width=Math.max(4,Math.round(c.width*r));s.height=Math.max(4,Math.round(c.height*r));
        s.getContext('2d').drawImage(im,0,0,s.width,s.height);x.drawImage(s,0,0,c.width,c.height);
      }else x.drawImage(im,0,0,c.width,c.height);
      URL.revokeObjectURL(u);
      c.toBlob(b=>b?res(b):rej(new Error('imagem')),'image/jpeg',q);
    };
    im.onerror=()=>rej(new Error('Não consegui abrir a imagem'));im.src=u;
  });
}
const toDataUrl=b=>new Promise(res=>{const f=new FileReader();f.onload=()=>res(f.result);f.readAsDataURL(b)});

const S={
  remote:REMOTE,
  uid,
  /* ----- auth ----- */
  async authState(){ // 'setup' (local, sem senha) | 'login' | 'in'
    if(REMOTE){await fresh();return sess()?'in':'login'}
    await loadLocal();
    if(!db.auth)return 'setup';
    return sessionStorage.getItem('qs-ok')?'in':'login';
  },
  userEmail(){return REMOTE?(sess()||{}).email||'':'(modo demonstração)'},
  async setup(pw){ // só local
    await loadLocal();const salt=crypto.getRandomValues(new Uint8Array(16));
    db.auth={salt:Array.from(salt),hash:await hashPw(pw,salt)};await saveLocal();sessionStorage.setItem('qs-ok','1');
  },
  async login(email,pw){
    if(REMOTE){
      const r=await fetch(C.supabaseUrl+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:C.supabaseKey,'Content-Type':'application/json'},body:JSON.stringify({email,password:pw})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error('E-mail ou senha incorretos.');
      setSess(pack(j));
      try{const a=await rest('admins?select=email&limit=1');if(!a||!a.length){setSess(null);throw new Error('Esta conta não tem permissão de administradora.')}}catch(e){setSess(null);throw e}
      return;
    }
    await loadLocal();const h=await hashPw(pw,new Uint8Array(db.auth.salt));
    if(h!==db.auth.hash)throw new Error('Senha incorreta.');sessionStorage.setItem('qs-ok','1');
  },
  logout(){setSess(null);sessionStorage.removeItem('qs-ok')},
  async recover(email){
    if(!REMOTE)throw new Error('No modo demonstração não há recuperação: apague os dados do navegador para recomeçar.');
    const r=await fetch(C.supabaseUrl+'/auth/v1/recover',{method:'POST',headers:{apikey:C.supabaseKey,'Content-Type':'application/json'},body:JSON.stringify({email})});
    if(!r.ok)throw new Error('Não foi possível enviar o e-mail.');
  },
  async changePassword(pw){
    if(REMOTE){await fresh();const r=await fetch(C.supabaseUrl+'/auth/v1/user',{method:'PUT',headers:hdr(),body:JSON.stringify({password:pw})});if(!r.ok)throw new Error('Não foi possível trocar a senha.');return}
    await loadLocal();const salt=crypto.getRandomValues(new Uint8Array(16));db.auth={salt:Array.from(salt),hash:await hashPw(pw,salt)};await saveLocal();
  },
  /* ----- settings ----- */
  async getSettings(){
    let s={};
    if(REMOTE){try{const r=await rest('settings?select=data&key=eq.site');if(r&&r[0])s=r[0].data}catch(e){}}
    else{await loadLocal();s=db.settings}
    return Object.assign(clone(SEED.settings),s);
  },
  async saveSettings(s){
    if(REMOTE)return up('settings',{key:'site',data:s});
    await loadLocal();db.settings=s;await saveLocal();
  },
  /* ----- imóveis ----- */
  async listProperties({admin=false}={}){
    let l;
    if(REMOTE){const r=await rest('properties?select=data,status&order=ord.desc.nullslast,created_at.desc');l=(r||[]).map(x=>x.data)}
    else{await loadLocal();l=clone(db.props)}
    if(!admin)l=l.filter(p=>p.status!=='rascunho');
    return l;
  },
  async getProperty(id,o={}){return (await this.listProperties(o)).find(p=>p.id===id)||null},
  async getSecret(id){
    if(REMOTE){const r=await rest('property_secrets?select=data&id=eq.'+encodeURIComponent(id));return r&&r[0]?r[0].data:{}}
    await loadLocal();return clone(db.secrets[id]||{});
  },
  async saveProperty(p,secret){
    p.atualizadoEm=new Date().toISOString();
    if(REMOTE){
      await up('properties',{id:p.id,status:p.status,offmarket:!!p.offmarket,destaque:!!p.destaque,data:p,updated_at:p.atualizadoEm});
      if(secret!==undefined)await up('property_secrets',{id:p.id,data:secret});return;
    }
    await loadLocal();const i=db.props.findIndex(x=>x.id===p.id);
    if(i<0)db.props.unshift(p);else db.props[i]=p;
    if(secret!==undefined)db.secrets[p.id]=secret;await saveLocal();
  },
  async deleteProperty(id){
    if(REMOTE)return rest('properties?id=eq.'+encodeURIComponent(id),{method:'DELETE'});
    await loadLocal();db.props=db.props.filter(p=>p.id!==id);delete db.secrets[id];await saveLocal();
  },
  /* ----- vídeos ----- */
  async listVideos(){
    if(REMOTE){const r=await rest('videos?select=data&order=ord.asc.nullslast');return (r||[]).map(x=>x.data)}
    await loadLocal();return clone(db.videos);
  },
  async saveVideo(v){
    if(REMOTE)return up('videos',{id:v.id,data:v,ord:v.ord||0});
    await loadLocal();const i=db.videos.findIndex(x=>x.id===v.id);i<0?db.videos.push(v):db.videos[i]=v;await saveLocal();
  },
  async deleteVideo(id){
    if(REMOTE)return rest('videos?id=eq.'+encodeURIComponent(id),{method:'DELETE'});
    await loadLocal();db.videos=db.videos.filter(v=>v.id!==id);await saveLocal();
  },
  /* ----- contatos (leads) ----- */
  async addLead(l){
    l.id=uid('l');l.criadoEm=new Date().toISOString();l.status='novo';
    if(REMOTE){await fetch(C.supabaseUrl+'/rest/v1/leads',{method:'POST',headers:{apikey:C.supabaseKey,Authorization:'Bearer '+C.supabaseKey,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({id:l.id,data:l})}).then(r=>{if(!r.ok)throw new Error('Não foi possível enviar agora.')});return l}
    await loadLocal();db.leads.unshift(l);await saveLocal();return l;
  },
  async listLeads(){
    if(REMOTE){const r=await rest('leads?select=data&order=created_at.desc&limit=500');return (r||[]).map(x=>x.data)}
    await loadLocal();return clone(db.leads);
  },
  async saveLead(l){
    if(REMOTE)return rest('leads?id=eq.'+encodeURIComponent(l.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({data:l})});
    await loadLocal();const i=db.leads.findIndex(x=>x.id===l.id);if(i>=0)db.leads[i]=l;await saveLocal();
  },
  async deleteLead(id){
    if(REMOTE)return rest('leads?id=eq.'+encodeURIComponent(id),{method:'DELETE'});
    await loadLocal();db.leads=db.leads.filter(l=>l.id!==id);await saveLocal();
  },
  /* ----- imagens ----- */
  async uploadImage(file,opt={}){
    const blob=await resize(file,opt);
    if(!REMOTE)return toDataUrl(blob);
    await fresh();const name=`${new Date().getFullYear()}/${uid('img')}.jpg`;
    const r=await fetch(C.supabaseUrl+'/storage/v1/object/media/'+name,{method:'POST',headers:{apikey:C.supabaseKey,Authorization:'Bearer '+(sess()||{}).access_token,'Content-Type':'image/jpeg','x-upsert':'true'},body:blob});
    if(!r.ok)throw new Error('Falha no envio da foto.');
    return C.supabaseUrl+'/storage/v1/object/public/media/'+name;
  },
  /* ----- backup ----- */
  async exportAll(){
    const props=await this.listProperties({admin:true});const secrets={};
    for(const p of props)if(p.offmarket)secrets[p.id]=await this.getSecret(p.id);
    return {versao:1,exportadoEm:new Date().toISOString(),settings:await this.getSettings(),props,secrets,videos:await this.listVideos(),leads:await this.listLeads()};
  },
  async importAll(d){
    if(!d||!d.props)throw new Error('Arquivo inválido.');
    if(!REMOTE){await loadLocal();db.props=d.props;db.secrets=d.secrets||{};db.videos=d.videos||[];db.leads=d.leads||[];db.settings=d.settings||db.settings;await saveLocal();return}
    for(const p of d.props)await this.saveProperty(p,(d.secrets||{})[p.id]);
    for(const v of d.videos||[])await this.saveVideo(v);
    if(d.settings)await this.saveSettings(d.settings);
    for(const l of d.leads||[])await rest('leads',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id:l.id,data:l})});
  },
  async loadExamples(){ // coloca os exemplos no banco real (ou restaura no local)
    if(!REMOTE){await loadLocal();db.props=clone(SEED.props);db.secrets=clone(SEED.secrets);await saveLocal();return}
    for(const p of SEED.props)await this.saveProperty(clone(p),SEED.secrets[p.id]);
  },
  async removeExamples(){
    const l=await this.listProperties({admin:true});
    for(const p of l)if(SEED.props.some(s=>s.id===p.id))await this.deleteProperty(p.id);
  },
  resize,toDataUrl
};
window.QS=window.QS||{};window.QS.store=S;
})();

/* Utilidades visuais, layout (cabeçalho/rodapé) e componentes compartilhados. */
(function(){
const QS=window.QS=window.QS||{};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl=n=>n>0?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(n):'Sob consulta';
const num=n=>new Intl.NumberFormat('pt-BR').format(n);

/* ---------- ícones ---------- */
const IC={
arrow:'M5 12h14M13 6l6 6-6 6',bed:'M3 19v-9a2 2 0 012-2h14a2 2 0 012 2v9M3 14h18M3 19v2M21 19v2M7 8V6h4v2',
bath:'M4 12h16v3a4 4 0 01-4 4H8a4 4 0 01-4-4v-3zM6 12V6a2 2 0 014 0M6 19l-1 2M18 19l1 2',car:'M5 16v-4l2-5h10l2 5v4M3 16h18M7 19v-3M17 19v-3M7 12h10',
area:'M4 4h6M4 4v6M20 20h-6M20 20v-6M4 20l6-6M20 4l-6 6',pin:'M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
heart:'M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z',phone:'M6 3h3l2 5-2 1.5a11 11 0 006 6L16.5 13l5 2v3a2 2 0 01-2 2A16 16 0 014 5a2 2 0 012-2z',
mail:'M3 6h18v12H3zM3 7l9 7 9-7',instagram:'M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4zM12 8a4 4 0 100 8 4 4 0 000-8zM17.5 6.5h.01',
whatsapp:'M3 21l1.6-4.6A8.5 8.5 0 1112 20.5a8.4 8.4 0 01-4-1L3 21zM9 8.5c0 3 3.5 6.5 6.5 6.5l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2L9 8.5z',
tiktok:'M14 3v11.5a3.5 3.5 0 11-3.5-3.5M14 3c.3 2.5 2 4 4.5 4.2',youtube:'M3 8a3 3 0 013-3h12a3 3 0 013 3v8a3 3 0 01-3 3H6a3 3 0 01-3-3zM10 9l5 3-5 3z',
facebook:'M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5a.5.5 0 01.5-.5z',linkedin:'M4 9h4v11H4zM6 4.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 9h4v1.6c.6-1 1.8-1.9 3.5-1.9 3 0 3.5 2 3.5 4.6V20h-4v-5.6c0-1.2-.1-2.4-1.5-2.4S14 13.1 14 14.4V20h-4z',
play:'M8 5l12 7-12 7z',lock:'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',x:'M5 5l14 14M19 5L5 19',menu:'M3 8h18M3 16h18',check:'M4 12l5 5L20 6',
cal:'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',key:'M14 10a4 4 0 11-1.2-2.8L21 15v3h-3v-2h-2v-2h-2l-1-1',home:'M3 11l9-8 9 8M5 10v10h14V10',
chev:'M9 6l6 6-6 6',chevl:'M15 6l-6 6 6 6',share:'M12 3v12M7 8l5-5 5 5M5 14v6h14v-6',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
shield:'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',chart:'M4 20V10M10 20V4M16 20v-8M22 20H2',star:'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
plus:'M12 5v14M5 12h14',trash:'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',edit:'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',copy:'M8 8h12v12H8zM4 16V4h12',
out:'M10 4H5v16h5M15 8l5 4-5 4M20 12H9',gear:'M12 9a3 3 0 100 6 3 3 0 000-6zM19 12l2-1-1-3-2 .3-1.4-1.4.3-2-3-1-1 2h-2l-1-2-3 1 .3 2L6 7.3 4 7l-1 3 2 1v2l-2 1 1 3 2-.3 1.4 1.4-.3 2 3 1 1-2h2l1 2 3-1-.3-2 1.4-1.4 2 .3 1-3-2-1z',
inbox:'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5',film:'M3 5h18v14H3zM7 5v14M17 5v14M3 10h4M3 14h4M17 10h4M17 14h4',user:'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
download:'M12 4v11M7 11l5 5 5-5M5 20h14',up:'M12 16V5M7 9l5-5 5 5M5 20h14',dots:'M5 12h.01M12 12h.01M19 12h.01',left:'M19 12H5M11 6l-6 6 6 6',right:'M5 12h14M13 6l6 6-6 6'
};
const ico=(n,c='')=>`<svg class="ico ${c}" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[n]||''}"/></svg>`;

/* ---------- imagens (ilustrações para os exemplos) ---------- */
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const rng=seed=>{let a=seed;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
const PAL=[['#f6dcb4','#e8a572','#2e2c3c'],['#d3e3ea','#8db1c3','#1f2d3a'],['#2c3148','#9a6f93','#f0bf8a'],['#ebe3d1','#c3b189','#2b3830'],['#f2cdb0','#d68a68','#2a212e'],['#c9d8cf','#7fa08d','#1d2b25']];
const artCache={};
function art(key){
  if(artCache[key])return artCache[key];
  const [,slug,n]=key.split(':'),i=+n||0,p=PAL[hash(slug)%PAL.length],r=rng(hash(slug)+i*977),dark=p[0][1]<'4';
  const sx=300+r()*400,sy=220+r()*120;
  let o=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset=".62" stop-color="${p[1]}"/></linearGradient><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[1]}"/><stop offset="1" stop-color="${p[2]}"/></linearGradient><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></linearGradient></defs><rect width="1000" height="800" fill="url(#a)"/>`;
  o+=`<circle cx="${sx}" cy="${sy}" r="${60+r()*30}" fill="${p[2]}" opacity="${dark?.9:.28}"/>`;
  o+=`<rect y="470" width="1000" height="330" fill="url(#s)"/>`;
  for(let k=0;k<9;k++)o+=`<rect x="${r()*900}" y="${490+k*32}" width="${60+r()*160}" height="2" fill="#fff" opacity=".22"/>`;
  let hx=0;o+=`<path d="M0 470 `;for(let k=0;k<=10;k++){hx=k*100;o+=`L${hx} ${420+r()*50} `}o+=`L1000 470Z" fill="${p[2]}" opacity=".55"/>`;
  const bw=380+r()*200,bx=(i%2?120:180)+r()*120,levels=2+Math.floor(r()*2);
  for(let l=0;l<levels;l++){
    const w=bw*(1-l*.16),x=bx+(bw-w)*(l%2?.7:.2),y=560-(l+1)*118;
    o+=`<rect x="${x}" y="${y}" width="${w}" height="108" fill="${p[2]}"/><rect x="${x+14}" y="${y+14}" width="${w-28}" height="80" fill="url(#g)"/>`;
    for(let c=1;c<5;c++)o+=`<rect x="${x+14+c*(w-28)/5}" y="${y+14}" width="2" height="80" fill="${p[2]}" opacity=".6"/>`;
    o+=`<rect x="${x-24}" y="${y+104}" width="${w+48}" height="8" fill="#f5f0e8" opacity=".9"/>`;
  }
  o+=`<rect x="${bx+bw*.55}" y="580" width="${300+r()*90}" height="76" fill="${p[1]}"/><rect x="${bx+bw*.55}" y="580" width="${300}" height="76" fill="#fff" opacity=".35"/>`;
  if(i>=2)o+=`<rect width="1000" height="800" fill="${p[2]}" opacity="${.12+.1*(i%3)}"/>`;
  o+=`</svg>`;
  return artCache[key]='data:image/svg+xml;utf8,'+encodeURIComponent(o);
}
const safeUrl=u=>{u=String(u||'');return /^(https?:\/\/|data:image\/|\/|\.\.?\/|[\w-]+\/)/i.test(u)?u:''};
const img=u=>!u?art('art:vazio:0'):u.startsWith('art:')?art(u):(safeUrl(u)||art('art:vazio:0'));

/* ---------- contatos ---------- */
const digits=s=>String(s||'').replace(/\D/g,'');
function waNum(S){let d=digits(S.whatsapp||S.telefone);if(d&&d.length<=11)d='55'+d;return d}
function waUrl(S,msg){const d=waNum(S);return d?`https://wa.me/${d}?text=${encodeURIComponent(msg||'Olá, Quézia! Vim pelo seu site.')}`:`https://ig.me/m/${esc(S.instagram||'queziarj')}`}
const waIsReal=S=>!!waNum(S);
function social(S){
  const h=v=>String(v||'').replace(/^@/,'').trim();
  const u=(v,b)=>/^https?:/i.test(v)?v:b+h(v);
  const L=[];
  if(S.instagram)L.push({k:'instagram',n:'Instagram',v:'@'+h(S.instagram).replace(/^https?:.*\.com\//,''),url:u(S.instagram,'https://instagram.com/')});
  if(S.tiktok)L.push({k:'tiktok',n:'TikTok',v:'@'+h(S.tiktok),url:u(S.tiktok,'https://tiktok.com/@')});
  if(S.youtube)L.push({k:'youtube',n:'YouTube',v:h(S.youtube),url:u(S.youtube,'https://youtube.com/@')});
  if(S.facebook)L.push({k:'facebook',n:'Facebook',v:h(S.facebook),url:u(S.facebook,'https://facebook.com/')});
  if(S.linkedin)L.push({k:'linkedin',n:'LinkedIn',v:h(S.linkedin),url:u(S.linkedin,'https://linkedin.com/in/')});
  return L;
}

/* ---------- estado ---------- */
let SET=null;
const fav={get(){try{return JSON.parse(localStorage.getItem('qs-fav')||'[]')}catch(e){return[]}},
 toggle(id){const l=fav.get(),i=l.indexOf(id);i<0?l.push(id):l.splice(i,1);try{localStorage.setItem('qs-fav',JSON.stringify(l))}catch(e){}return i<0},has(id){return fav.get().includes(id)}};

/* ---------- layout ---------- */
const NAV=[['imoveis.html','Imóveis'],['reservados.html','Quézia Private','lock'],['vender.html','Anuncie'],['portfolio.html','Portfólio'],['sobre.html','Sobre'],['contato.html','Contato']];
function portrait(S,extra=''){return `<div class="portrait">${S.foto?`<img src="${esc(img(S.foto))}" alt="${esc(S.nome)}">`:`<div class="mono">${esc((S.nome||'Q')[0])}${esc((S.nome||'Q S').split(' ')[1]?.[0]||'')}</div>`}</div>${extra}`}
function layout(S){
  const page=document.body.dataset.page;const on=h=>location.pathname.endsWith('/'+h)?'on':'';
  const soc=social(S);
  const logo=`<a class="logo" href="index.html" aria-label="${esc(S.marca)}"><b>${esc(S.marca)}</b><small>${esc(S.titulo)}${S.creci?' · CRECI '+esc(S.creci):''}</small></a>`;
  const links=NAV.map(([h,t,i])=>`<a href="${h}" class="${on(h)} ${i?'priv':''}">${i?ico(i,''):''}${t}</a>`).join('');
  document.body.insertAdjacentHTML('afterbegin',`
  <header class="hdr"><div class="wrap in">${logo}<nav class="nav">${links}</nav><a class="btn sm cta" href="contato.html#visita">Agendar visita</a><button class="burger" aria-label="Menu" id="bg">${ico('menu')}</button></div></header>
  <div class="mnav" id="mn"><div class="top">${logo}<button id="mx" aria-label="Fechar">${ico('x','')}</button></div>
  <nav>${[['index.html','Início']].concat(NAV).map(([h,t])=>`<a href="${h}">${t}${ico('arrow')}</a>`).join('')}</nav>
  <div class="soc">${soc.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${s.n}">${ico(s.k)}</a>`).join('')}<a href="${esc(waUrl(S))}" target="_blank" rel="noopener" aria-label="WhatsApp">${ico('whatsapp')}</a></div></div>`);
  const cont=[];
  if(S.telefone||S.whatsapp)cont.push(`<li>${ico('phone')}<a href="tel:+${waNum(S)}">${esc(S.telefone||S.whatsapp)}</a></li>`);
  if(S.email)cont.push(`<li>${ico('mail')}<a href="mailto:${esc(S.email)}">${esc(S.email)}</a></li>`);
  if(S.endereco)cont.push(`<li>${ico('pin')}<span>${esc(S.endereco)}</span></li>`);
  if(S.horario)cont.push(`<li>${ico('cal')}<span>${esc(S.horario)}</span></li>`);
  document.body.insertAdjacentHTML('beforeend',`
  <footer class="ftr"><div class="wrap"><div class="cols">
   <div><a class="logo" href="index.html"><b>${esc(S.marca)}</b><small>${esc(S.titulo)}</small></a><p class="big">Seu próximo endereço começa numa boa conversa.</p>
     <div class="soc">${soc.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${s.n}">${ico(s.k)}</a>`).join('')}<a href="${esc(waUrl(S))}" target="_blank" rel="noopener" aria-label="WhatsApp">${ico('whatsapp')}</a></div></div>
   <div><h4>Explorar</h4><ul><li><a href="imoveis.html?f=venda">Imóveis à venda</a></li><li><a href="imoveis.html?f=aluguel">Imóveis para alugar</a></li><li><a href="reservados.html">Quézia Private</a></li><li><a href="portfolio.html">Portfólio</a></li></ul></div>
   <div><h4>Com a Quézia</h4><ul><li><a href="vender.html">Anunciar meu imóvel</a></li><li><a href="sobre.html">Sobre</a></li><li><a href="contato.html#visita">Agendar visita</a></li><li><a href="contato.html">Contato</a></li></ul></div>
   <div><h4>Contato</h4><ul>${cont.join('')||`<li>${ico('instagram')}<a href="${esc(soc[0]?.url||'#')}" target="_blank" rel="noopener">@${esc(S.instagram)}</a></li>`}</ul>
     <form id="nl" style="margin-top:22px;display:flex;border-bottom:1px solid var(--line-l)"><input class="hp" name="website" tabindex="-1" autocomplete="off"><input name="email" type="email" required placeholder="Novos imóveis no seu e-mail" style="flex:1;background:transparent;border:0;outline:0;color:inherit;padding:12px 0;font-size:14px"><button aria-label="Assinar" style="padding:0 6px;color:var(--gold2)">${ico('arrow')}</button></form></div>
  </div><div class="bot"><span>© ${new Date().getFullYear()} ${esc(S.nome)} · ${esc(S.titulo)}${S.creci?' · CRECI '+esc(S.creci):''}</span><span>Valores e condições sujeitos a alteração sem aviso prévio.</span></div></div></footer>
  <a class="fab" href="${esc(waUrl(S))}" target="_blank" rel="noopener"><span class="av">${S.foto?`<img src="${esc(img(S.foto))}" alt="">`:esc((S.nome||'Q')[0])}</span><span>Fale com a Quézia<small>${waIsReal(S)?'Responde no WhatsApp':'Chame no Instagram'}</small></span></a>`);
  const h=$('.hdr'),sc=()=>h.classList.toggle('solid',scrollY>40);sc();addEventListener('scroll',sc,{passive:true});
  $('#bg').onclick=()=>$('#mn').classList.add('open');$('#mx').onclick=()=>$('#mn').classList.remove('open');
  $('#nl').onsubmit=async e=>{e.preventDefault();const f=e.target;if(f.website.value)return;try{await QS.store.addLead({tipo:'newsletter',nome:'',email:f.email.value,mensagem:'Quer receber novos imóveis.'});f.innerHTML='<span style="padding:12px 0;font-size:14px;color:var(--gold2)">Pronto! Você receberá as novidades.</span>'}catch(x){toast(x.message)}};
}
function reveal(){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.08});$$('.rv:not(.in)').forEach(el=>io.observe(el))}
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),3200)}
function modal(html,{dark=false,cls=''}={}){
  const m=document.createElement('div');m.className='modal '+cls;m.innerHTML=`<div class="box ${dark?'dk':''}" role="dialog" aria-modal="true"><button class="x" aria-label="Fechar">${ico('x')}</button>${html}</div>`;
  const close=()=>{m.remove();removeEventListener('keydown',k);document.body.style.overflow=''};const k=e=>e.key==='Escape'&&close();
  m.addEventListener('mousedown',e=>{if(e.target===m)close()});$('.x',m).onclick=close;addEventListener('keydown',k);document.body.append(m);document.body.style.overflow='hidden';m.close=close;return m;
}

/* ---------- cartões ---------- */
const precoHTML=p=>p.preco>0?`${brl(p.preco)}${p.finalidade==='aluguel'?'<small> /mês</small>':''}`:'Sob consulta';
function specs(p,keys=['area','quartos','banheiros','vagas']){
  const m={area:[p.area,'area',v=>num(v)+' m²'],quartos:[p.quartos,'bed',v=>v+(v>1?' quartos':' quarto')],suites:[p.suites,'key',v=>v+(v>1?' suítes':' suíte')],banheiros:[p.banheiros,'bath',v=>v],vagas:[p.vagas,'car',v=>v+(v>1?' vagas':' vaga')]};
  return keys.filter(k=>m[k][0]>0).map(k=>`<span>${ico(m[k][1])}${m[k][2](m[k][0])}</span>`).join('');
}
function card(p){
  const sold=p.status==='vendido'||p.status==='alugado';
  return `<article class="card ${sold?'sold':''} rv">
  <a href="imovel.html?id=${encodeURIComponent(p.id)}" class="ph"><img loading="lazy" src="${esc(img((p.fotos||[])[0]))}" alt="${esc(p.titulo)}"><div class="badges"><span class="badge">${p.finalidade==='venda'?'Venda':'Aluguel'}</span>${p.destaque&&!sold?'<span class="badge gold">Destaque</span>':''}${sold?`<span class="badge st">${p.status==='vendido'?'Vendido':'Alugado'}</span>`:''}</div></a>
  <button class="fav ${fav.has(p.id)?'on':''}" data-fav="${esc(p.id)}" aria-label="Favoritar">${ico('heart')}</button>
  <div class="meta"><div class="loc">${ico('pin')}${esc(p.bairro)}${p.cidade?' · '+esc(p.cidade):''}</div><h3><a href="imovel.html?id=${encodeURIComponent(p.id)}">${esc(p.titulo)}</a></h3><div class="price">${sold?esc(p.tipo):precoHTML(p)}</div><div class="specs">${specs(p)}</div></div></article>`;
}
function pcard(p){
  return `<article class="pcard rv"><div class="ph"><img loading="lazy" src="${esc(img(p.capa||(p.fotos||[])[0]))}" alt=""><div class="lk"><span>${ico('lock')}Detalhes reservados</span></div></div>
  <div class="meta"><div class="ref">Ref. ${esc(p.ref||'—')} · ${esc(p.tipo)}</div><h3>${esc(p.titulo)}</h3><div class="loc" style="font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:rgba(245,240,232,.6)">${esc(p.bairro)} · ${esc(p.cidade||'')}</div>
  <div class="faixa">${esc(p.faixa||'Sob consulta')}</div><p style="font-size:14.5px;color:rgba(245,240,232,.62);font-weight:300;margin-bottom:16px">${esc(p.teaser||'')}</p><div class="specs">${specs(p,['area','suites','vagas'])}</div>
  <button class="btn gold block" data-access="${esc(p.id)}">Solicitar acesso ${ico('arrow')}</button></div></article>`;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-fav]');if(!b)return;e.preventDefault();const on=fav.toggle(b.dataset.fav);b.classList.toggle('on',on);toast(on?'Salvo nos favoritos':'Removido dos favoritos');if(QS.onFav)QS.onFav()});

/* ---------- formulários ---------- */
function okHTML(S,title,msg,wa){return `<div class="ok"><div class="tick">${ico('check')}</div><h3>${esc(title)}</h3><p style="color:var(--muted);margin-top:8px">${esc(msg)}</p><div class="acts"><a class="btn gold" target="_blank" rel="noopener" href="${esc(waUrl(S,wa))}">${ico('whatsapp')}${waIsReal(S)?'Enviar também no WhatsApp':'Chamar no Instagram'}</a></div></div>`}
/* liga um <form> a um lead. build(fd) devolve o objeto do lead; done(lead) devolve {title,msg,wa} */
function bindForm(form,S,build,done){
  form.addEventListener('submit',async e=>{
    e.preventDefault();const fd=Object.fromEntries(new FormData(form));if(fd.website)return;
    const btn=form.querySelector('button[type=submit]');const t=btn.innerHTML;btn.disabled=true;btn.textContent='Enviando…';
    try{const lead=build(fd);await QS.store.addLead(lead);const r=done(lead);form.innerHTML=okHTML(S,r.title,r.msg,r.wa)}
    catch(x){btn.disabled=false;btn.innerHTML=t;toast(x.message||'Erro ao enviar')}
  });
}
const hpot='<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">';
const fld=(l,n,t='text',x='')=>`<div class="fld"><label for="f-${n}">${l}</label><input id="f-${n}" name="${n}" type="${t}" ${x}></div>`;
function embed(url){
  url=String(url||'');let m;
  if((m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/)))return `<iframe src="https://www.youtube.com/embed/${m[1]}?rel=0" allow="autoplay;encrypted-media;picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
  if((m=url.match(/instagram\.com\/(?:reel|p|tv)\/([\w-]+)/)))return `<iframe src="https://www.instagram.com/p/${m[1]}/embed" allowtransparency="true" scrolling="no" loading="lazy"></iframe>`;
  if((m=url.match(/vimeo\.com\/(\d+)/)))return `<iframe src="https://player.vimeo.com/video/${m[1]}" allowfullscreen loading="lazy"></iframe>`;
  if(/\.(mp4|webm|mov)(\?|$)/i.test(url)&&safeUrl(url))return `<video src="${esc(url)}" controls playsinline></video>`;
  return '';
}

Object.assign(QS,{$,$$,esc,brl,num,ico,art,img,safeUrl,waUrl,waIsReal,waNum,social,fav,layout,reveal,toast,modal,card,pcard,precoHTML,specs,portrait,bindForm,hpot,fld,embed,okHTML,digits,
  get S(){return SET}});
QS.boot=async function(){
  SET=await QS.store.getSettings();layout(SET);
  const fn=QS.pages&&QS.pages[document.body.dataset.page];if(fn)await fn(SET);
  reveal();
};
})();

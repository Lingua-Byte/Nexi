/* Controladores de cada página pública. */
(function(){
const QS=window.QS,{$,$$,esc,brl,num,ico,img,card,pcard,toast,modal,bindForm,hpot,fld,waUrl,waIsReal,social,embed,portrait}=QS;
const store=QS.store;
const P={};QS.pages=P;
const pubProps=async()=>(await store.listProperties()).filter(p=>!p.offmarket);
const uniq=a=>[...new Set(a.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
const opts=(arr,all)=>`<option value="">${all}</option>`+arr.map(x=>`<option>${esc(x)}</option>`).join('');
const paras=t=>String(t||'').split(/\n{2,}/).map(s=>`<p>${esc(s).replace(/\n/g,'<br>')}</p>`).join('');
const TIPOS=['Apartamento','Casa','Cobertura','Terreno','Comercial','Mansão'];
const setMeta=(t,d)=>{document.title=t;const m=$('meta[name=description]');if(m&&d)m.content=d};

/* ================= HOME ================= */
P.home=async S=>{
  const [all,videos]=await Promise.all([store.listProperties(),store.listVideos()]);
  const pub=all.filter(p=>!p.offmarket),act=pub.filter(p=>p.status==='ativo'),priv=all.filter(p=>p.offmarket&&p.status==='ativo');
  $('#hbg').style.backgroundImage=`url("${img(S.heroImagem||'art:hero:1')}")`;
  $('#ht').innerHTML=`${esc(S.heroTitulo)} <em>${esc(S.heroDestaque)}</em>`;$('#hs').textContent=S.heroSub;
  $('#hp').innerHTML=portrait(S,`<div class="portrait-tag"><b>${esc(S.nome)}</b><span>${esc(S.titulo)}${S.creci?' · CRECI '+esc(S.creci):''}</span></div>`);
  /* busca */
  let fin='venda';
  $('#sb').innerHTML=opts(uniq(act.map(p=>p.bairro)),'Todos os bairros');$('#st').innerHTML=opts(uniq(act.map(p=>p.tipo)),'Todos os tipos');
  $$('#stabs button').forEach(b=>b.onclick=()=>{fin=b.dataset.f;$$('#stabs button').forEach(x=>x.classList.toggle('on',x===b))});
  $('#sform').onsubmit=e=>{e.preventDefault();const q=new URLSearchParams({f:fin});if($('#sb').value)q.set('bairro',$('#sb').value);if($('#st').value)q.set('tipo',$('#st').value);if($('#sq').value)q.set('quartos',$('#sq').value);location.href='imoveis.html?'+q}
  /* faixa de bairros */
  const reg=(S.regioes&&S.regioes.length?S.regioes:uniq(act.map(p=>p.bairro)));
  if(reg.length){const row=reg.map(r=>`<span>${esc(r)}</span>`).join('');$('#marq').innerHTML=`<div>${row}${row}</div>`}else $('#marq').remove();
  /* destaques */
  let feat=act.filter(p=>p.destaque);if(feat.length<3)feat=act;feat=feat.slice(0,feat.length>=6?6:3);
  $('#feat').innerHTML=feat.length?feat.map(card).join(''):'<div class="empty" style="grid-column:1/-1"><h3>Novos imóveis em breve</h3><p>Fale comigo e receba as oportunidades em primeira mão.</p></div>';
  /* private */
  if(priv.length)$('#privgrid').innerHTML=priv.slice(0,3).map(pcard).join('');else $('#privgrid').innerHTML='';
  /* sobre + números */
  $('#hport').innerHTML=portrait(S);
  const done=pub.filter(p=>p.status!=='ativo').length;
  const stats=[[act.length,'imóveis à venda e locação'],[uniq(pub.map(p=>p.bairro)).length,'bairros atendidos']];
  if(priv.length)stats.push([priv.length,'imóveis reservados']);if(done)stats.push([done,'negócios concluídos']);if(S.anos)stats.push([S.anos,'anos de mercado']);
  $('#stats').innerHTML=stats.slice(0,4).map(([n,l])=>`<div><b>${num(n)}</b><span>${l}</span></div>`).join('');
  $('#stats').style.setProperty('--n',Math.min(stats.length,4));
  $('#sobt').innerHTML=esc((S.bio||'').split(/\n{2,}/)[0]||'');
  /* vídeos */
  $('#vids').innerHTML=videos.length?videos.slice(0,3).map(v=>vcard(v)).join(''):`<a class="vcard" style="grid-column:1/-1;aspect-ratio:auto;padding:70px 30px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;border:1px solid var(--line-l)" href="${esc(social(S)[0]?.url||'#')}" target="_blank" rel="noopener">${ico('instagram','')}<b style="font-family:var(--serif);font-size:30px;font-weight:500">Os vídeos de cada imóvel estão no Instagram</b><small style="color:var(--gold2);letter-spacing:.24em;text-transform:uppercase;font-size:11px">@${esc(S.instagram)}</small></a>`;
  bindVideos(videos);
  $('#cta-wa').href=waUrl(S,'Olá, Quézia! Tenho um imóvel para vender/alugar e gostaria de conversar.');
  $('#cta-por').innerHTML=portrait(S);
};
function vcard(v){return `<button class="vcard rv" data-vid="${esc(v.id)}"><img loading="lazy" src="${esc(img(v.capa||'art:'+v.id+':1'))}" alt=""><span class="pl">${ico('play')}</span><span class="cap"><small>${esc(v.tag||'Vídeo')}</small><b>${esc(v.titulo)}</b></span></button>`}
function bindVideos(list){
  document.addEventListener('click',e=>{const b=e.target.closest('[data-vid]');if(!b)return;const v=list.find(x=>x.id===b.dataset.vid);if(!v)return;
    const em=embed(v.url);const m=modal(`<div style="padding-top:34px">${em?`<div class="vid" ${/instagram/.test(v.url)?'style="aspect-ratio:9/14;max-height:76vh;margin:auto"':''}>${em}</div>`:''}<h3 style="margin-top:18px">${esc(v.titulo)}</h3>${v.url&&QS.safeUrl(v.url)?`<p style="margin-top:14px"><a class="link" href="${esc(v.url)}" target="_blank" rel="noopener">Abrir no site original ${ico('arrow')}</a></p>`:''}${v.imovelId?`<p style="margin-top:14px"><a class="btn sm" href="imovel.html?id=${encodeURIComponent(v.imovelId)}">Ver o imóvel</a></p>`:''}</div>`,{dark:true});m.querySelector('.box').style.maxWidth='760px'});
}

/* ================= LISTAGEM ================= */
P.imoveis=async S=>{
  const all=(await pubProps()).filter(p=>p.status==='ativo');
  const q0=new URLSearchParams(location.search);
  const st={f:q0.get('f')||'todos',tipo:q0.get('tipo')||'',bairro:q0.get('bairro')||'',q:'',quartos:q0.get('quartos')||'',max:'',ord:'rec',fav:false};
  const PAGE=9;let shown=PAGE;
  $('#fb').innerHTML=opts(uniq(all.map(p=>p.bairro)),'Bairro');$('#ft').innerHTML=opts(uniq(all.map(p=>p.tipo)),'Tipo');
  $('#fb').value=st.bairro;$('#ft').value=st.tipo;$('#fq').value=st.quartos;
  const MAX={venda:[[1e6,'até R$ 1 mi'],[2e6,'até R$ 2 mi'],[4e6,'até R$ 4 mi'],[8e6,'até R$ 8 mi'],[15e6,'até R$ 15 mi']],aluguel:[[5e3,'até R$ 5 mil'],[8e3,'até R$ 8 mil'],[12e3,'até R$ 12 mil'],[20e3,'até R$ 20 mil'],[30e3,'até R$ 30 mil']]};
  const fillMax=()=>{const l=MAX[st.f];$('#fm').innerHTML='<option value="">Preço máximo</option>'+(l?l.map(([v,t])=>`<option value="${v}">${t}</option>`).join(''):'');$('#fm').disabled=!l;st.max=''};
  const filt=()=>{
    let l=all.filter(p=>(st.f==='todos'||p.finalidade===st.f)&&(!st.tipo||p.tipo===st.tipo)&&(!st.bairro||p.bairro===st.bairro)&&(!st.quartos||p.quartos>=+st.quartos)&&(!st.max||p.preco<=+st.max)&&(!st.fav||QS.fav.has(p.id))&&(!st.q||(p.titulo+' '+p.bairro+' '+p.tipo+' '+(p.descricao||'')).toLowerCase().includes(st.q.toLowerCase())));
    const o={rec:(a,b)=>(b.destaque-a.destaque)||String(b.criadoEm).localeCompare(a.criadoEm),pa:(a,b)=>a.preco-b.preco,pd:(a,b)=>b.preco-a.preco,ar:(a,b)=>b.area-a.area}[st.ord];
    return l.sort(o);
  };
  const render=()=>{
    const l=filt();$('#fc').textContent=l.length?`${l.length} ${l.length>1?'imóveis':'imóvel'}`:'Nenhum imóvel';
    $('#grid').innerHTML=l.length?l.slice(0,shown).map(card).join(''):`<div class="empty" style="grid-column:1/-1"><h3>Nenhum imóvel com esses filtros</h3><p>Tente ampliar a busca — ou me conte o que procura e eu aviso quando surgir.</p><p style="margin-top:20px"><a class="btn" href="contato.html">Falar com a Quézia</a></p></div>`;
    const rest=l.length-shown;$('#more').innerHTML=rest>0?`<span>Mostrando ${shown} de ${l.length}</span><button class="btn ghost" id="mb">Ver mais ${Math.min(rest,PAGE)} imóveis ${ico('arrow')}</button>`:(l.length>PAGE?`<span>Você viu todos os ${l.length} imóveis.</span>`:'');
    const mb=$('#mb');if(mb)mb.onclick=()=>{shown+=PAGE;render()};QS.reveal();
  };
  const set=(k,v)=>{st[k]=v;shown=PAGE;render()};
  $$('#fp button').forEach(b=>{b.classList.toggle('on',b.dataset.f===st.f);b.onclick=()=>{$$('#fp button').forEach(x=>x.classList.toggle('on',x===b));st.f=b.dataset.f;fillMax();shown=PAGE;render()}});
  $('#fb').onchange=e=>set('bairro',e.target.value);$('#ft').onchange=e=>set('tipo',e.target.value);$('#fq').onchange=e=>set('quartos',e.target.value);$('#fm').onchange=e=>set('max',e.target.value);$('#fo').onchange=e=>set('ord',e.target.value);
  $('#fs').oninput=e=>set('q',e.target.value);
  $('#ffav').onclick=e=>{st.fav=!st.fav;e.currentTarget.classList.toggle('on',st.fav);e.currentTarget.style.background=st.fav?'var(--ink)':'';e.currentTarget.style.color=st.fav?'var(--ivory)':'';shown=PAGE;render()};
  QS.onFav=()=>{if(st.fav)render()};
  fillMax();render();
};

/* ================= DETALHE ================= */
P.imovel=async S=>{
  const id=new URLSearchParams(location.search).get('id');const p=await store.getProperty(id);
  const root=$('#d');
  if(!p){root.innerHTML=`<div class="empty wrap" style="padding-top:200px"><h3>Imóvel não encontrado</h3><p>Ele pode ter sido vendido ou retirado do ar.</p><p style="margin-top:20px"><a class="btn" href="imoveis.html">Ver todos os imóveis</a></p></div>`;return}
  if(p.offmarket){location.replace('reservados.html');return}
  setMeta(`${p.titulo} · ${p.bairro} | ${S.marca}`,(p.descricao||'').slice(0,150));
  const fotos=(p.fotos&&p.fotos.length?p.fotos:['art:vazio:0']),sold=p.status==='vendido'||p.status==='alugado';
  const fin=p.finalidade==='venda';
  const lh=`https://www.google.com/maps?q=${encodeURIComponent(p.bairro+', '+(p.cidade||'Rio de Janeiro')+', '+(p.estado||'RJ'))}&output=embed`;
  const sp=[[p.area,'m²','Área'],[p.quartos,'','Quartos'],[p.suites,'','Suítes'],[p.banheiros,'','Banheiros'],[p.vagas,'','Vagas']].filter(x=>x[0]>0);
  root.innerHTML=`
  <section style="padding-top:110px"><div class="wrap">
   <div class="crumbs"><a href="index.html">Início</a>·<a href="imoveis.html?f=${p.finalidade}">${fin?'Venda':'Aluguel'}</a>·<span>${esc(p.bairro)}</span></div>
   <div class="dgal"><div class="main" data-lb="0"><img src="${esc(img(fotos[0]))}" alt="${esc(p.titulo)}"></div><div class="side">${[1,2].map(i=>`<div data-lb="${Math.min(i,fotos.length-1)}"><img src="${esc(img(fotos[i]||fotos[0]))}" alt="">${i===2&&fotos.length>3?`<span class="all">+ ${fotos.length-3} fotos</span>`:''}</div>`).join('')}</div></div>
   <div class="dlay"><div>
    <span class="eyebrow">${esc(p.tipo)} · ${fin?'Venda':'Aluguel'}${sold?' · '+(p.status==='vendido'?'Vendido':'Alugado'):''}</span>
    <h1 style="font-size:clamp(36px,5vw,64px)">${esc(p.titulo)}</h1>
    <p style="margin-top:14px;display:flex;gap:8px;align-items:center;color:var(--muted)">${ico('pin')}${esc(p.bairro)}, ${esc(p.cidade||'')}${p.estado?' – '+esc(p.estado):''}</p>
    <div class="dprice">${sold?'<span style="color:var(--muted)">'+(p.status==='vendido'?'Vendido':'Alugado')+'</span>':QS.precoHTML(p)}</div>
    <p style="color:var(--muted);font-size:14px">${[p.condominio>0?'Condomínio '+brl(p.condominio):'',p.iptu>0?'IPTU '+brl(p.iptu)+'/mês':''].filter(Boolean).join(' · ')}</p>
    <div class="dspec">${sp.map(([v,u,l])=>`<div><b>${num(v)}${u?'<small style="font-size:16px"> '+u+'</small>':''}</b><span>${l}</span></div>`).join('')}</div>
    <div class="prose">${paras(p.descricao)}</div>
    ${(p.destaques||[]).length?`<div class="dblock"><h3>Destaques</h3><ul class="tags">${p.destaques.map(d=>`<li>${ico('star')}${esc(d)}</li>`).join('')}</ul></div>`:''}
    ${(p.comodidades||[]).length?`<div class="dblock"><h3>Comodidades</h3><ul class="tags">${p.comodidades.map(d=>`<li>${ico('check')}${esc(d)}</li>`).join('')}</ul></div>`:''}
    ${embed(p.video)?`<div class="dblock"><h3>Vídeo do imóvel</h3><div class="vid" ${/instagram/.test(p.video)?'style="aspect-ratio:9/14;max-height:78vh;margin:auto"':''}>${embed(p.video)}</div></div>`:''}
    <div class="dblock"><h3>Localização</h3><div class="map"><iframe loading="lazy" src="${esc(lh)}" title="Mapa"></iframe></div><p style="font-size:13px;color:var(--muted);margin-top:10px">Localização aproximada do bairro. O endereço exato é informado no agendamento.</p></div>
    ${fin&&p.preco>0&&!sold?`<div class="dblock"><h3>Simule o financiamento</h3><div class="panel"><div class="fgrid">${fld('Entrada (%)','ent','number','value="30" min="0" max="90"')}${fld('Prazo (anos)','prz','number','value="30" min="5" max="35"')}${fld('Taxa de juros (% ao ano)','tx','number','value="11.5" step="0.1"')}<div class="fld"><label>Parcela estimada</label><b id="parc" style="font-family:var(--serif);font-size:34px;font-weight:500">—</b></div></div><p style="font-size:12.5px;color:var(--muted);margin-top:14px">Simulação ilustrativa (tabela Price). Condições reais dependem do banco e da análise de crédito.</p></div></div>`:''}
   </div>
   <aside><div class="panel dk">${sold?`<h3>Gostou deste perfil?</h3><p style="color:rgba(245,240,232,.65);margin-bottom:20px">Este imóvel já foi ${p.status==='vendido'?'vendido':'alugado'}, mas posso encontrar algo parecido para você.</p><a class="btn gold block" href="contato.html">Quero algo semelhante</a>`:`<h3>Agende uma visita</h3><p style="color:rgba(245,240,232,.6);font-size:14px;margin-bottom:22px">Retorno rápido, sem compromisso.</p>
     <form id="vf" class="fgrid">${hpot}<div class="fld full"><label>Nome</label><input name="nome" required autocomplete="name"></div><div class="fld full"><label>WhatsApp / telefone</label><input name="telefone" type="tel" required autocomplete="tel"></div><div class="fld"><label>Data</label><input name="data" type="date" required min="${new Date().toISOString().slice(0,10)}"></div><div class="fld"><label>Horário</label><select name="hora">${['09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00'].map(h=>`<option>${h}</option>`).join('')}</select></div><div class="fld full"><label>E-mail (opcional)</label><input name="email" type="email"></div><button class="btn gold block full" type="submit">Solicitar visita ${ico('arrow')}</button></form>
     <p style="text-align:center;margin:18px 0 10px;color:rgba(245,240,232,.45);font-size:12px;letter-spacing:.2em;text-transform:uppercase">ou</p>
     <a class="btn ghost block" target="_blank" rel="noopener" href="${esc(waUrl(S,`Olá, Quézia! Tenho interesse no imóvel "${p.titulo}" (${p.bairro}). Pode me passar mais informações?`))}">${ico('whatsapp')}${waIsReal(S)?'Conversar no WhatsApp':'Chamar no Instagram'}</a>`}
     <div style="display:flex;gap:10px;margin-top:22px;align-items:center;padding-top:20px;border-top:1px solid var(--line-l)"><div style="width:48px;height:48px;border-radius:50%;overflow:hidden;background:var(--ink3);display:grid;place-items:center;font-family:var(--serif);font-style:italic;color:var(--gold2)">${S.foto?`<img src="${esc(img(S.foto))}" style="width:100%;height:100%;object-fit:cover;object-position:top" alt="">`:esc(S.nome[0])}</div><div><b style="font-family:var(--serif);font-size:20px;font-weight:500">${esc(S.nome)}</b><br><small style="color:var(--gold2);letter-spacing:.2em;text-transform:uppercase;font-size:10px">${esc(S.titulo)}</small></div></div></div>
    <div style="display:flex;gap:10px;margin-top:14px"><button class="btn ghost sm" id="shr" style="flex:1">${ico('share')}Compartilhar</button><button class="btn ghost sm fv" data-fav="${esc(p.id)}" style="flex:1">${ico('heart')}Favoritar</button></div>
   </aside></div></div></section>
  <section class="sec sand" id="sim" style="margin-top:50px"><div class="wrap"><div class="shead"><h2>Imóveis <em>parecidos</em></h2><a class="link" href="imoveis.html?f=${p.finalidade}">Ver todos ${ico('arrow')}</a></div><div class="grid" id="simg"></div></div></section>`;
  /* lightbox */
  let li=0;const lb=i=>{li=(i+fotos.length)%fotos.length;let el=$('.lb');if(!el){el=document.createElement('div');el.className='lb';document.body.append(el);document.body.style.overflow='hidden'}
    el.innerHTML=`<div class="bar"><span>${li+1} / ${fotos.length}</span><button id="lbx" aria-label="Fechar">${ico('x')}</button></div><div class="stage"><img src="${esc(img(fotos[li]))}" alt=""><button class="nv pv" aria-label="Anterior">${ico('chevl')}</button><button class="nv nx" aria-label="Próxima">${ico('chev')}</button></div>`;
    $('#lbx').onclick=()=>{el.remove();document.body.style.overflow=''};$('.pv',el).onclick=()=>lb(li-1);$('.nx',el).onclick=()=>lb(li+1)};
  $$('[data-lb]').forEach(el=>el.onclick=()=>lb(+el.dataset.lb));
  addEventListener('keydown',e=>{if(!$('.lb'))return;if(e.key==='Escape')$('#lbx').click();if(e.key==='ArrowRight')lb(li+1);if(e.key==='ArrowLeft')lb(li-1)});
  $('#shr').onclick=async()=>{try{if(navigator.share)await navigator.share({title:p.titulo,url:location.href});else{await navigator.clipboard.writeText(location.href);toast('Link copiado')}}catch(e){}};
  /* simulador */
  if($('#parc')){const calc=()=>{const ent=+$('#f-ent').value/100,n=(+$('#f-prz').value)*12,i=Math.pow(1+(+$('#f-tx').value)/100,1/12)-1,pv=p.preco*(1-ent);const pm=i?pv*i/(1-Math.pow(1+i,-n)):pv/n;$('#parc').textContent=isFinite(pm)?brl(pm)+' /mês':'—'};['ent','prz','tx'].forEach(k=>$('#f-'+k).oninput=calc);calc()}
  /* form visita */
  const vf=$('#vf');if(vf)bindForm(vf,S,fd=>({tipo:'visita',nome:fd.nome,telefone:fd.telefone,email:fd.email,data:fd.data,hora:fd.hora,imovelId:p.id,imovelTitulo:p.titulo,mensagem:`Visita solicitada para ${fd.data} às ${fd.hora}.`}),l=>({title:'Pedido de visita enviado',msg:`Vou confirmar ${l.data.split('-').reverse().join('/')} às ${l.hora} pelo seu contato.`,wa:`Olá, Quézia! Solicitei uma visita ao imóvel "${p.titulo}" para ${l.data.split('-').reverse().join('/')} às ${l.hora}. Meu nome é ${l.nome}.`}));
  /* parecidos */
  const all=(await pubProps()).filter(x=>x.id!==p.id&&x.status==='ativo');
  const sim=all.map(x=>({x,s:(x.finalidade===p.finalidade?3:0)+(x.bairro===p.bairro?2:0)+(x.tipo===p.tipo?1:0)})).sort((a,b)=>b.s-a.s).slice(0,3).map(o=>o.x);
  if(sim.length)$('#simg').innerHTML=sim.map(card).join('');else $('#sim').remove();
};

/* ================= RESERVADOS (off-market) ================= */
P.reservados=async S=>{
  const l=(await store.listProperties()).filter(p=>p.offmarket&&p.status==='ativo');
  $('#pg').innerHTML=l.length?l.map(pcard).join(''):`<div class="empty" style="grid-column:1/-1;color:rgba(245,240,232,.6)"><h3 style="color:var(--ivory)">A coleção é atualizada sob demanda</h3><p>Cadastre seu perfil e eu aviso quando um imóvel compatível chegar.</p></div>`;
  const ask=(p)=>{
    const m=modal(`<div style="padding-top:20px"><div class="eyebrow">${ico('lock')} Acesso reservado</div><h3>${p?esc(p.titulo)+' · '+esc(p.ref||''):'Cadastro na coleção Quézia Private'}</h3><p style="color:rgba(245,240,232,.65);margin:10px 0 26px;font-size:15px">Os detalhes completos — endereço, valores e fotos — são apresentados pessoalmente, após uma breve conversa. Suas informações são tratadas com sigilo.</p>
     <form id="af" class="fgrid">${hpot}<div class="fld"><label>Nome</label><input name="nome" required autocomplete="name"></div><div class="fld"><label>WhatsApp</label><input name="telefone" type="tel" required autocomplete="tel"></div><div class="fld full"><label>E-mail</label><input name="email" type="email" required></div>
     <div class="fld"><label>Perfil</label><select name="perfil"><option>Comprador para moradia</option><option>Investidor</option><option>Representante / family office</option><option>Corretor parceiro</option></select></div><div class="fld"><label>Faixa de interesse</label><select name="faixa"><option>R$ 5 a 10 mi</option><option>R$ 10 a 20 mi</option><option>R$ 20 a 40 mi</option><option>Acima de R$ 40 mi</option></select></div>
     <div class="fld full"><label>Algo que devo saber? (opcional)</label><textarea name="mensagem" rows="2"></textarea></div><label class="chk full" style="color:rgba(245,240,232,.6)"><input type="checkbox" required>Concordo em manter sigilo sobre as informações dos imóveis reservados.</label>
     <button class="btn gold block full" type="submit">Enviar solicitação ${ico('arrow')}</button></form></div>`,{dark:true});
    bindForm($('#af',m),S,fd=>({tipo:'acesso',nome:fd.nome,telefone:fd.telefone,email:fd.email,perfil:fd.perfil,faixa:fd.faixa,mensagem:fd.mensagem||'',imovelId:p?p.id:'',imovelTitulo:p?(p.ref+' · '+p.titulo):'Coleção completa'}),l=>({title:'Solicitação recebida',msg:'Vou analisar e entrar em contato de forma reservada.',wa:`Olá, Quézia! Solicitei acesso ${p?'ao imóvel reservado '+p.ref:'à coleção Quézia Private'}. Sou ${l.nome}.`}));
    $('.ok',m);
  };
  document.addEventListener('click',e=>{const b=e.target.closest('[data-access]');if(b)ask(l.find(p=>p.id===b.dataset.access));const c=e.target.closest('[data-access-all]');if(c)ask(null)});
};

/* ================= ANUNCIE ================= */
P.vender=async S=>{
  const m=new URLSearchParams(location.search).get('modo');if(m)$('#modo').value=m;
  $('#bairros').innerHTML=uniq([...(S.regioes||[])]).map(b=>`<option value="${esc(b)}">`).join('');
  bindForm($('#of'),S,fd=>({tipo:'proprietario',nome:fd.nome,telefone:fd.telefone,email:fd.email,finalidade:fd.modo,imovelTitulo:`${fd.tipoImovel} · ${fd.bairro}`,dados:{tipoImovel:fd.tipoImovel,bairro:fd.bairro,area:fd.area,valor:fd.valor,horario:fd.horario},mensagem:fd.mensagem||''}),l=>({title:'Recebi os dados do seu imóvel',msg:'Vou preparar uma análise de mercado e te chamar no horário combinado.',wa:`Olá, Quézia! Quero ${l.finalidade.toLowerCase()} meu ${l.dados.tipoImovel} em ${l.dados.bairro}. Meu nome é ${l.nome}.`}));
  $('#vwa').href=waUrl(S,'Olá, Quézia! Tenho um imóvel para vender/alugar e gostaria de uma avaliação.');
};

/* ================= PORTFÓLIO ================= */
P.portfolio=async S=>{
  const [videos,all]=await Promise.all([store.listVideos(),pubProps()]);
  const done=all.filter(p=>p.status==='vendido'||p.status==='alugado');
  $('#pv').innerHTML=videos.length?videos.map(vcard).join(''):`<div class="empty" style="grid-column:1/-1;color:rgba(245,240,232,.6)"><h3 style="color:var(--ivory)">Vídeos em breve</h3><p>Enquanto isso, acompanhe os tours no Instagram.</p></div>`;
  bindVideos(videos);
  $('#pd').innerHTML=done.length?done.map(card).join(''):`<div class="empty" style="grid-column:1/-1"><h3>Em breve</h3><p>Os negócios fechados aparecerão aqui.</p></div>`;
  const ig=social(S)[0];
  $('#pi').innerHTML=`<div class="panel dk center" style="padding:clamp(40px,8vw,90px)"><div style="color:var(--gold2);margin-bottom:18px">${ico('instagram')}</div><h2 style="margin-bottom:14px">Bastidores, tours e lançamentos</h2><p class="lead" style="margin-bottom:30px">Todo dia tem imóvel novo, dica de mercado e uma visita guiada no perfil.</p><a class="btn gold" href="${esc(ig?ig.url:'#')}" target="_blank" rel="noopener">Seguir @${esc(S.instagram)} ${ico('arrow')}</a></div>`;
  const dep=S.depoimentos||[];
  if(dep.length)$('#pdep').innerHTML=`<section class="sec dark"><div class="wrap"><div class="shead"><h2>Quem <em>confiou</em></h2></div><div class="fix">${dep.map(d=>`<div class="tcard"><p>“${esc(d.texto)}”</p><small>${esc(d.nome)}${d.cargo?' · '+esc(d.cargo):''}</small></div>`).join('')}</div></div></section>`;
  const tabs=$$('#ptabs button'),pans=$$('.ppan');
  const go=k=>{tabs.forEach(b=>b.classList.toggle('on',b.dataset.t===k));pans.forEach(p=>p.hidden=p.dataset.t!==k);history.replaceState(null,'','#'+k);QS.reveal()};
  tabs.forEach(b=>b.onclick=()=>go(b.dataset.t));go(['videos','fechados','instagram'].includes(location.hash.slice(1))?location.hash.slice(1):'videos');
};

/* ================= SOBRE ================= */
P.sobre=async S=>{
  $('#sp').innerHTML=portrait(S,`<div class="portrait-tag"><b>${esc(S.nome)}</b><span>${esc(S.titulo)}${S.creci?' · CRECI '+esc(S.creci):''}</span></div>`);
  $('#sbio').innerHTML=paras(S.bio);
  $('#sval').innerHTML=(S.valores||[]).map(v=>`<li>${ico('check')}${esc(v)}</li>`).join('');
  $('#sreg').innerHTML=(S.regioes||[]).map(v=>`<li>${ico('pin')}${esc(v)}</li>`).join('');
  $('#sig').href=social(S)[0]?.url||'#';$('#swa').href=waUrl(S);
  const soc=social(S);$('#ssoc').innerHTML=soc.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${s.n}">${ico(s.k)}</a>`).join('');
};

/* ================= CONTATO ================= */
P.contato=async S=>{
  const soc=social(S),cards=[];
  const wn=QS.waNum(S);
  if(wn)cards.push(['whatsapp','WhatsApp',S.whatsapp||S.telefone,waUrl(S)]);
  if(S.telefone)cards.push(['phone','Telefone',S.telefone,'tel:+'+QS.waNum({telefone:S.telefone})]);
  if(S.email)cards.push(['mail','E-mail',S.email,'mailto:'+S.email]);
  soc.forEach(s=>cards.push([s.k,s.n,s.v,s.url]));
  if(!wn)cards.unshift(['whatsapp','Mensagem direta','Chame no Instagram',waUrl(S)]);
  $('#cc').innerHTML=cards.map(([i,t,v,u])=>`<a class="ccard" href="${esc(u)}" ${/^http/.test(u)?'target="_blank" rel="noopener"':''}>${ico(i)}<small>${t}</small><b>${esc(v)}</b></a>`).join('')+(S.endereco?`<div class="ccard">${ico('pin')}<small>Atendimento</small><b>${esc(S.endereco)}</b></div>`:'')+`<div class="ccard">${ico('cal')}<small>Horário</small><b>${esc(S.horario||'')}</b></div>`;
  const act=(await pubProps()).filter(p=>p.status==='ativo');
  const id=new URLSearchParams(location.search).get('imovel');
  $('#vimov').innerHTML='<option value="">Ainda não sei / quero sugestões</option>'+act.map(p=>`<option value="${esc(p.id)}" ${p.id===id?'selected':''}>${esc(p.titulo)} — ${esc(p.bairro)}</option>`).join('');
  $('#vd').min=new Date().toISOString().slice(0,10);
  bindForm($('#mf'),S,fd=>({tipo:'contato',nome:fd.nome,telefone:fd.telefone,email:fd.email,assunto:fd.assunto,mensagem:fd.mensagem}),l=>({title:'Mensagem enviada',msg:'Respondo o mais rápido possível.',wa:`Olá, Quézia! Sou ${l.nome}. Enviei uma mensagem pelo site (${l.assunto}).`}));
  bindForm($('#vf'),S,fd=>{const p=act.find(x=>x.id===fd.imovel);return {tipo:'visita',nome:fd.nome,telefone:fd.telefone,email:fd.email,data:fd.data,hora:fd.hora,imovelId:fd.imovel||'',imovelTitulo:p?p.titulo:'A definir',mensagem:fd.mensagem||''}},l=>({title:'Visita solicitada',msg:`Vou confirmar ${l.data.split('-').reverse().join('/')} às ${l.hora} pelo seu contato.`,wa:`Olá, Quézia! Solicitei uma visita para ${l.data.split('-').reverse().join('/')} às ${l.hora}. Sou ${l.nome}.`}));
  const tabs=$$('#ctabs button'),pans=$$('.cpan');
  const go=k=>{tabs.forEach(b=>b.classList.toggle('on',b.dataset.t===k));pans.forEach(p=>p.hidden=p.dataset.t!==k)};
  tabs.forEach(b=>b.onclick=()=>{go(b.dataset.t);history.replaceState(null,'','#'+b.dataset.t)});go(location.hash==='#visita'?'visita':'msg');
  addEventListener('hashchange',()=>go(location.hash==='#visita'?'visita':'msg'));
  const q=encodeURIComponent((S.endereco||S.cidade||'Rio de Janeiro')+', RJ');$('#mapa').innerHTML=`<iframe loading="lazy" title="Mapa" src="https://www.google.com/maps?q=${q}&output=embed"></iframe>`;
};
})();

/* Painel da Quézia. Só abre depois de login; com Supabase configurado, os dados só são lidos/escritos com a sessão dela. */
(function(){
const QS=window.QS,{$,$$,esc,brl,ico,toast,modal,img,waNum}=QS,store=QS.store;
const root=$('#app');
let view='resumo',D={props:[],leads:[],videos:[],S:{}};
const LT={visita:'Visita',contato:'Mensagem',proprietario:'Proprietário',acesso:'Acesso reservado',newsletter:'Newsletter'};
const TIPOS=['Apartamento','Casa','Cobertura','Terreno','Comercial','Mansão'];
const COMOD=['Piscina','Academia','Segurança 24h','Portaria 24h','Varanda gourmet','Churrasqueira','Ar-condicionado','Mobiliado','Aceita pets','Vista mar','Playground','Quadra','Salão de festas','Automação','Elevador privativo','Spa'];
const fmtD=iso=>{try{return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(e){return ''}};
const lines=t=>String(t||'').split('\n').map(s=>s.trim()).filter(Boolean);

/* ---------------- entrada ---------------- */
async function start(){
  const s=await store.authState();
  if(s==='in')return load();
  loginScreen(s);
}
function loginScreen(mode,msg=''){
  const remote=store.remote;
  root.innerHTML=`<div class="login"><div class="box"><a class="logo" href="../index.html"><b>Quézia Santos</b><small>Painel privado</small></a>
  <h1>${mode==='setup'?'Criar senha':'Entrar'}</h1><p style="color:rgba(245,240,232,.6);margin-bottom:24px;font-size:14.5px">${mode==='setup'?'Modo demonstração: escolha uma senha para este painel (mínimo 8 caracteres).':'Área restrita à proprietária do site.'}</p>
  <form id="lf" autocomplete="on">${remote?'<div class="fld"><label>E-mail</label><input name="email" type="email" required autocomplete="username"></div>':''}
  <div class="fld"><label>Senha</label><input name="pw" type="password" required minlength="${mode==='setup'?8:1}" autocomplete="${mode==='setup'?'new-password':'current-password'}"></div>
  <div class="err" id="er">${esc(msg)}</div><button class="btn gold block" type="submit">${mode==='setup'?'Criar e entrar':'Entrar'}</button></form>
  ${remote?'<p style="margin-top:18px"><a class="mut" id="fg">Esqueci minha senha</a></p>':''}
  ${!remote?'<p style="margin-top:22px;font-size:12.5px;color:rgba(245,240,232,.45)">Este painel está sem banco de dados conectado: ele só funciona neste navegador e <b>não protege</b> um site publicado. Veja o README para ativar o modo seguro.</p>':''}</div></div>`;
  $('#lf').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;$('#er').textContent='';
    try{mode==='setup'?await store.setup(f.pw.value):await store.login(remote?f.email.value:'',f.pw.value);load()}catch(x){$('#er').textContent=x.message;b.disabled=false}};
  const fg=$('#fg');if(fg)fg.onclick=async()=>{const em=$('#lf').email.value;if(!em){$('#er').textContent='Digite seu e-mail acima.';return}try{await store.recover(em);$('#er').style.color='#9ad7a8';$('#er').textContent='Se o e-mail existir, enviamos um link.'}catch(x){$('#er').textContent=x.message}};
}
async function load(){
  root.innerHTML='<p style="padding:40px;text-align:center;color:#888">Carregando painel…</p>';
  try{[D.props,D.leads,D.videos,D.S]=await Promise.all([store.listProperties({admin:true}),store.listLeads(),store.listVideos(),store.getSettings()])}
  catch(e){root.innerHTML=`<div style="padding:40px;max-width:600px;margin:auto"><div class="hint bad">Não consegui carregar os dados: ${esc(e.message)}<br>Se você acabou de configurar o banco, confira se o arquivo <b>schema.sql</b> foi executado.</div><button class="btn" id="lo">Sair</button></div>`;$('#lo').onclick=()=>{store.logout();location.reload()};return}
  shell();
}
const newCount=()=>D.leads.filter(l=>l.status==='novo').length;
const NAV=[['resumo','Resumo','chart'],['imoveis','Imóveis','home'],['leads','Contatos','inbox'],['videos','Vídeos','film'],['site','Meu site','user'],['conta','Conta','gear']];
function shell(){
  const n=newCount();document.title=(n?`(${n}) `:'')+'Painel · Quézia Santos';
  root.innerHTML=`${store.remote?'':'<div class="demo"><b>Modo demonstração</b> — os dados ficam só neste navegador e o painel não é seguro. Configure o Supabase (README) antes de publicar.</div>'}
  <div class="ad"><aside class="side"><a class="logo" href="../index.html"><b>Quézia Santos</b><small>Painel</small></a>
   ${NAV.map(([k,t,i])=>`<button class="nv ${view===k?'on':''}" data-v="${k}">${ico(i)}${t}${k==='leads'&&n?`<span class="n">${n}</span>`:''}</button>`).join('')}
   <div class="sp"></div><a class="nv" href="../index.html" target="_blank">${ico('eye')}Ver o site</a><button class="nv" id="lo">${ico('out')}Sair</button></aside>
  <main class="main" id="view"></main></div>
  <nav class="tabbar">${NAV.map(([k,t,i])=>`<button class="${view===k?'on':''}" data-v="${k}">${ico(i)}${t}${k==='leads'&&n?`<span class="n">${n}</span>`:''}</button>`).join('')}</nav>`;
  $$('[data-v]').forEach(b=>b.onclick=()=>{view=b.dataset.v;shell()});
  $('#lo').onclick=()=>{store.logout();location.reload()};
  ({resumo:vResumo,imoveis:vImoveis,leads:vLeads,videos:vVideos,site:vSite,conta:vConta})[view]($('#view'));
}

/* ---------------- resumo ---------------- */
function vResumo(el){
  const P=D.props,act=P.filter(p=>p.status==='ativo'&&!p.offmarket),n=newCount();
  const visits=D.leads.filter(l=>l.tipo==='visita'&&l.status!=='concluído').sort((a,b)=>String(a.data).localeCompare(b.data)).slice(0,5);
  const S=D.S,todo=[[!!S.foto,'Adicionar sua foto','site'],[!!(S.whatsapp||S.telefone),'Informar WhatsApp / telefone','site'],[!!S.email,'Informar e-mail','site'],[!!S.creci,'Informar o número do CRECI','site'],[P.some(p=>p.status==='ativo'&&!(String(p.id).startsWith('p-'))),'Cadastrar seu primeiro imóvel real','imoveis'],[D.videos.length>0,'Adicionar vídeos ao portfólio','videos']];
  const demo=P.some(p=>String(p.id).startsWith('p-'));
  el.innerHTML=`<h1>Olá, ${esc((S.nome||'').split(' ')[0])}</h1><p class="sub">Resumo do seu site.</p>
  ${demo?`<div class="hint"><b>Há imóveis de exemplo no site.</b> Eles servem só para demonstração — cadastre os seus e depois remova os exemplos em <a href="#" id="gc" style="text-decoration:underline">Conta</a>.</div>`:''}
  <div class="kpis"><div class="kpi ${n?'hot':''}"><b>${n}</b><span>Contatos novos</span></div><div class="kpi"><b>${act.filter(p=>p.finalidade==='venda').length}</b><span>À venda</span></div><div class="kpi"><b>${act.filter(p=>p.finalidade==='aluguel').length}</b><span>Para alugar</span></div><div class="kpi"><b>${P.filter(p=>p.offmarket&&p.status==='ativo').length}</b><span>Reservados</span></div><div class="kpi"><b>${P.filter(p=>p.status==='rascunho').length}</b><span>Rascunhos</span></div></div>
  <div class="cols2"><div class="box2"><h3>Próximas visitas</h3>${visits.length?visits.map(l=>`<div style="padding:10px 0;border-bottom:1px solid var(--line)"><b>${esc(l.nome)}</b> · ${esc(l.data?l.data.split('-').reverse().join('/'):'')} ${esc(l.hora||'')}<br><small style="color:var(--muted)">${esc(l.imovelTitulo||'')}</small></div>`).join(''):'<p style="color:var(--muted)">Nenhuma visita pendente.</p>'}<p style="margin-top:14px"><button class="btn sm ghost" data-go="leads">Ver contatos</button></p></div>
  <div class="box2"><h3>Para ficar completo</h3><ul class="check">${todo.map(([d,t,v])=>`<li class="${d?'done':''}">${ico(d?'check':'plus')}${t}${d?'':`<a href="#" data-go="${v}">Fazer</a>`}</li>`).join('')}</ul></div></div>
  <div class="box2"><h3>Atalhos</h3><div class="bar"><button class="btn sm" id="nn">${ico('plus')} Novo imóvel</button><button class="btn sm ghost" id="nr">${ico('lock')} Novo imóvel reservado</button><button class="btn sm ghost" data-go="videos">${ico('film')} Adicionar vídeo</button></div></div>`;
  $$('[data-go]',el).forEach(b=>b.onclick=e=>{e.preventDefault();view=b.dataset.go;shell()});if($('#gc'))$('#gc').onclick=e=>{e.preventDefault();view='conta';shell()};
  $('#nn').onclick=()=>editProp();$('#nr').onclick=()=>editProp(null,{offmarket:true});
}

/* ---------------- imóveis ---------------- */
let pf='todos',pq='';
function vImoveis(el){
  const F={todos:()=>true,venda:p=>p.finalidade==='venda'&&!p.offmarket,aluguel:p=>p.finalidade==='aluguel'&&!p.offmarket,reservados:p=>p.offmarket,rascunho:p=>p.status==='rascunho',encerrados:p=>p.status==='vendido'||p.status==='alugado'};
  const l=D.props.filter(F[pf]).filter(p=>!pq||(p.titulo+p.bairro+(p.ref||'')).toLowerCase().includes(pq.toLowerCase()));
  el.innerHTML=`<h1>Imóveis</h1><p class="sub">Venda, aluguel e reservados. ${D.props.length} no total.</p>
  <div class="bar"><button class="btn sm" id="nn">${ico('plus')} Novo imóvel</button><input class="in2 grow" id="pq" placeholder="Buscar…" value="${esc(pq)}"></div>
  <div class="bar">${Object.keys(F).map(k=>`<button class="chip ${pf===k?'on':''}" data-f="${k}">${{todos:'Todos',venda:'Venda',aluguel:'Aluguel',reservados:'Reservados',rascunho:'Rascunhos',encerrados:'Vendidos/alugados'}[k]}</button>`).join('')}</div>
  ${l.length?l.map(p=>`<div class="row"><img class="th" src="${esc(img((p.fotos||[])[0]))}" alt=""><div><div class="t">${esc(p.titulo)}</div><div class="m"><span class="tag ${p.offmarket?'d':''}">${p.offmarket?'Reservado '+esc(p.ref||''):p.finalidade}</span><span>${esc(p.bairro)}</span><span>${p.offmarket?esc(p.faixa||''):brl(p.preco)}</span><span class="tag ${p.status==='ativo'?'ok':p.status==='rascunho'?'r':''}">${p.status}</span>${p.destaque?'<span class="tag g">destaque</span>':''}</div></div>
   <div class="acts"><button class="ib" data-e="${esc(p.id)}" title="Editar">${ico('edit')}</button><button class="ib" data-c="${esc(p.id)}" title="Duplicar">${ico('copy')}</button>${p.offmarket?'':`<a class="ib" href="../imovel.html?id=${encodeURIComponent(p.id)}" target="_blank" title="Ver no site">${ico('eye')}</a>`}<button class="ib dng" data-x="${esc(p.id)}" title="Excluir">${ico('trash')}</button></div></div>`).join(''):`<div class="empty2">Nenhum imóvel aqui ainda.</div>`}`;
  $('#nn').onclick=()=>editProp();$('#pq').oninput=e=>{pq=e.target.value;const pos=e.target.selectionStart;vImoveis(el);const i=$('#pq');i.focus();i.setSelectionRange(pos,pos)};
  $$('[data-f]',el).forEach(b=>b.onclick=()=>{pf=b.dataset.f;vImoveis(el)});
  $$('[data-e]',el).forEach(b=>b.onclick=()=>editProp(b.dataset.e));
  $$('[data-c]',el).forEach(b=>b.onclick=async()=>{const p=D.props.find(x=>x.id===b.dataset.c),s=p.offmarket?await store.getSecret(p.id):undefined;const c=JSON.parse(JSON.stringify(p));c.id=store.uid('p');c.titulo+=' (cópia)';c.status='rascunho';c.destaque=false;if(c.offmarket)c.ref=nextRef();await store.saveProperty(c,s);toast('Duplicado como rascunho');await refresh()});
  $$('[data-x]',el).forEach(b=>b.onclick=async()=>{const p=D.props.find(x=>x.id===b.dataset.x);if(!confirm(`Excluir "${p.titulo}" para sempre?`))return;await store.deleteProperty(p.id);toast('Imóvel excluído');await refresh()});
}
const nextRef=()=>'QP-'+String(D.props.filter(p=>p.offmarket).reduce((m,p)=>Math.max(m,parseInt(String(p.ref||'').replace(/\D/g,''))||0),0)+1).padStart(3,'0');
async function refresh(){D.props=await store.listProperties({admin:true});D.leads=await store.listLeads();D.videos=await store.listVideos();shell()}

async function editProp(id,preset={}){
  let p=id?JSON.parse(JSON.stringify(D.props.find(x=>x.id===id))):Object.assign({id:store.uid('p'),finalidade:'venda',tipo:'Apartamento',status:'rascunho',cidade:'Rio de Janeiro',estado:'RJ',fotos:[],destaques:[],comodidades:[],criadoEm:new Date().toISOString().slice(0,10),destaque:false,offmarket:false},preset);
  let sec=p.offmarket&&id?await store.getSecret(p.id):{};
  if(p.offmarket){p.descricao=sec.descricao||'';p.video=sec.video||''}
  let fotos=p.offmarket?(sec.fotos||[]):(p.fotos||[]);let capa=p.capa||'';
  const ed=document.createElement('div');ed.className='edit';document.body.append(ed);document.body.style.overflow='hidden';
  const close=()=>{ed.remove();document.body.style.overflow=''};
  const num=(n,l,x='')=>`<div class="fld"><label>${l}</label><input name="${n}" type="number" min="0" step="any" value="${p[n]||''}" ${x}></div>`;
  ed.innerHTML=`<div class="top"><button class="ib" id="bk" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.3)" aria-label="Voltar">${ico('left')}</button><h2>${id?'Editar imóvel':'Novo imóvel'}</h2><button class="btn gold sm" id="sv">Salvar</button></div>
  <form class="body" id="pf" autocomplete="off">
  <div class="sect">Tipo de anúncio</div>
  <div class="fg"><div class="fld"><label>Finalidade</label><select name="finalidade"><option value="venda">Venda</option><option value="aluguel">Aluguel</option></select></div>
  <div class="fld"><label>Situação</label><select name="status"><option value="ativo">Publicado</option><option value="rascunho">Rascunho (não aparece no site)</option><option value="vendido">Vendido</option><option value="alugado">Alugado</option></select></div>
  <div class="fld"><label>Tipo do imóvel</label><select name="tipo">${TIPOS.map(t=>`<option>${t}</option>`).join('')}</select></div></div>
  <div class="sw" style="margin-top:14px"><label><input type="checkbox" name="destaque"> Destaque na página inicial</label><label><input type="checkbox" name="offmarket" id="om"> Imóvel reservado (off-market, Quézia Private)</label></div>
  <div class="sect">Informações</div>
  <div class="fg"><div class="fld wf"><label>Título</label><input name="titulo" required placeholder="Ex.: Cobertura duplex com vista para o mar" value="${esc(p.titulo||'')}"></div>
  <div class="fld"><label>Bairro</label><input name="bairro" required list="dl-b" value="${esc(p.bairro||'')}"><datalist id="dl-b">${[...new Set([...(D.S.regioes||[]),...D.props.map(x=>x.bairro)])].map(b=>`<option value="${esc(b)}">`).join('')}</datalist></div>
  <div class="fld"><label>Cidade</label><input name="cidade" value="${esc(p.cidade||'')}"></div><div class="fld"><label>UF</label><input name="estado" maxlength="2" value="${esc(p.estado||'')}"></div></div>
  <div class="fg" style="margin-top:14px" id="vals">${num('preco','Preço (R$)')}${num('condominio','Condomínio (R$)')}${num('iptu','IPTU mensal (R$)')}${num('area','Área (m²)')}${num('quartos','Quartos')}${num('suites','Suítes')}${num('banheiros','Banheiros')}${num('vagas','Vagas')}</div>
  <div class="sect">Descrição</div>
  <div class="fld"><textarea name="descricao" rows="7" placeholder="Conte a história do imóvel. Separe parágrafos com uma linha em branco.">${esc(p.descricao||'')}</textarea></div>
  <div class="fg" style="margin-top:14px"><div class="fld"><label>Destaques (um por linha)</label><textarea name="destaques" rows="4">${esc((p.destaques||[]).join('\n'))}</textarea></div>
  <div class="fld"><label>Comodidades</label><div class="sw" id="cm" style="gap:8px 16px">${COMOD.map(c=>`<label><input type="checkbox" value="${c}" ${(p.comodidades||[]).includes(c)?'checked':''}>${c}</label>`).join('')}</div><input class="in2" name="outras" placeholder="Outras, separadas por vírgula" value="${esc((p.comodidades||[]).filter(c=>!COMOD.includes(c)).join(', '))}" style="margin-top:8px"></div></div>
  <div class="sect" id="ph-t">Fotos</div><p class="hint" id="ph-h" style="display:none">Imóvel reservado: estas fotos ficam <b>só no painel</b> (para você mostrar pessoalmente). No site aparece apenas a imagem de vitrine desfocada, abaixo.</p>
  <div class="photos" id="ph"></div>
  <div class="sect">Vídeo</div><div class="fld"><label>Link do vídeo (YouTube, Instagram Reel ou arquivo .mp4)</label><input name="video" placeholder="https://" value="${esc(p.video||'')}"></div>
  <div id="omx" hidden><div class="sect">Quézia Private — vitrine pública</div>
   <div class="fg"><div class="fld"><label>Referência</label><input name="ref" value="${esc(p.ref||nextRef())}"></div><div class="fld w2"><label>Faixa de valor exibida</label><input name="faixa" placeholder="Ex.: Acima de R$ 10 milhões" value="${esc(p.faixa||'')}"></div><div class="fld wf"><label>Texto de apresentação (aparece no site)</label><textarea name="teaser" rows="2">${esc(p.teaser||'')}</textarea></div></div>
   <div class="fld" style="margin-top:14px"><label>Imagem de vitrine (será desfocada automaticamente — a original não é publicada)</label><div style="display:flex;gap:14px;align-items:center"><img id="capa" src="${esc(img(capa))}" style="width:120px;height:90px;object-fit:cover;background:var(--sand)" alt=""><button type="button" class="btn sm ghost" id="capb">Escolher foto</button></div></div>
   <div class="privbox"><b style="font-family:var(--serif);font-size:24px;font-weight:500">Dados confidenciais (só você vê)</b><div class="fg" style="margin-top:16px"><div class="fld wf"><label>Endereço completo</label><input name="s_endereco" value="${esc(sec.endereco||'')}"></div><div class="fld"><label>Preço real</label><input name="s_precoReal" value="${esc(sec.precoReal||'')}"></div><div class="fld w2"><label>Proprietário / contato</label><input name="s_proprietario" value="${esc(sec.proprietario||'')}"></div><div class="fld wf"><label>Anotações</label><textarea name="s_notas" rows="3">${esc(sec.notas||'')}</textarea></div></div></div></div>
  </form>`;
  const f=$('#pf',ed);
  f.finalidade.value=p.finalidade;f.status.value=p.status;f.tipo.value=p.tipo;f.destaque.checked=!!p.destaque;f.offmarket.checked=!!p.offmarket;
  const sync=()=>{const o=f.offmarket.checked;$('#omx',ed).hidden=!o;$('#ph-h',ed).style.display=o?'':'none';$('#vals',ed).style.display=o?'none':''; };
  f.offmarket.onchange=sync;sync();
  const drawPh=()=>{
    $('#ph',ed).innerHTML=fotos.map((u,i)=>`<div class="ph2"><img src="${esc(img(u))}" alt="">${i===0?'<span class="cv">Capa</span>':''}<div class="tl"><button type="button" data-m="${i}" data-d="-1" title="Mover">‹</button><button type="button" data-m="${i}" data-d="1" title="Mover">›</button><button type="button" data-r="${i}" title="Remover">✕</button></div></div>`).join('')+`<label class="addph">${ico('plus')}Adicionar fotos<input type="file" accept="image/*" multiple hidden id="fi"></label><button type="button" class="addph" id="fu">${ico('share')}Por link</button>`;
    $$('[data-m]',ed).forEach(b=>b.onclick=()=>{const i=+b.dataset.m,j=i+ +b.dataset.d;if(j<0||j>=fotos.length)return;[fotos[i],fotos[j]]=[fotos[j],fotos[i]];drawPh()});
    $$('[data-r]',ed).forEach(b=>b.onclick=()=>{fotos.splice(+b.dataset.r,1);drawPh()});
    $('#fi',ed).onchange=async e=>{const fs=[...e.target.files];toast(`Enviando ${fs.length} foto(s)…`);for(const file of fs){try{fotos.push(await store.uploadImage(file))}catch(x){toast(x.message)}}drawPh()};
    $('#fu',ed).onclick=()=>{const u=prompt('Cole o endereço (URL) da imagem:');if(u&&QS.safeUrl(u)){fotos.push(u);drawPh()}};
  };drawPh();
  $('#capb',ed).onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=async()=>{try{capa=await store.uploadImage(i.files[0],{max:900,blur:1});$('#capa',ed).src=capa}catch(x){toast(x.message)}};i.click()};
  $('#bk',ed).onclick=()=>{if(confirm('Sair sem salvar?'))close()};
  $('#sv',ed).onclick=async()=>{
    if(!f.reportValidity())return;const g=n=>f[n].value.trim(),nu=n=>+f[n].value||0,om=f.offmarket.checked;
    const comod=[...$$('#cm input:checked',ed)].map(i=>i.value).concat(g('outras').split(',').map(s=>s.trim()).filter(Boolean));
    Object.assign(p,{finalidade:g('finalidade'),status:g('status'),tipo:g('tipo'),destaque:f.destaque.checked,offmarket:om,titulo:g('titulo'),bairro:g('bairro'),cidade:g('cidade'),estado:g('estado').toUpperCase(),preco:om?0:nu('preco'),condominio:nu('condominio'),iptu:nu('iptu'),area:nu('area'),quartos:nu('quartos'),suites:nu('suites'),banheiros:nu('banheiros'),vagas:nu('vagas'),descricao:g('descricao'),destaques:lines(f.destaques.value),comodidades:comod,video:g('video')});
    let secret;
    if(om){if(!capa){toast('Escolha a imagem de vitrine do imóvel reservado.');return}Object.assign(p,{ref:g('ref'),faixa:g('faixa'),teaser:g('teaser'),capa,fotos:[capa],descricao:'',video:''});secret={endereco:g('s_endereco'),precoReal:g('s_precoReal'),proprietario:g('s_proprietario'),notas:g('s_notas'),fotos,descricao:g('descricao'),video:g('video')}}
    else{p.fotos=fotos;if(id&&D.props.find(x=>x.id===id).offmarket)secret={}}
    const b=$('#sv',ed);b.disabled=true;b.textContent='Salvando…';
    try{await store.saveProperty(p,secret);toast('Imóvel salvo ✓');close();await refresh()}catch(x){b.disabled=false;b.textContent='Salvar';toast('Erro: '+x.message)}
  };
}

/* ---------------- contatos ---------------- */
let lt='todos',ls='abertos';
function vLeads(el){
  const l=D.leads.filter(x=>(lt==='todos'||x.tipo===lt)&&(ls==='todos'||(ls==='abertos'?x.status!=='concluído':x.status===ls)));
  el.innerHTML=`<h1>Contatos</h1><p class="sub">Mensagens, visitas, proprietários e pedidos de acesso.</p>
  <div class="bar">${['todos',...Object.keys(LT)].map(k=>`<button class="chip ${lt===k?'on':''}" data-t="${k}">${k==='todos'?'Todos':LT[k]}${k!=='todos'?' ('+D.leads.filter(x=>x.tipo===k).length+')':''}</button>`).join('')}</div>
  <div class="bar"><select id="ls"><option value="abertos">Em aberto</option><option value="novo">Novos</option><option value="em contato">Em contato</option><option value="concluído">Concluídos</option><option value="todos">Todos</option></select><span class="grow"></span><button class="btn sm ghost" id="csv">${ico('download')} Exportar CSV</button></div>
  ${l.length?l.map(x=>{const tel=waNum({telefone:x.telefone});return `<div class="lead-c ${x.status==='novo'?'new':''}"><div class="h"><span class="tag ${x.tipo==='acesso'?'d':x.tipo==='visita'?'g':''}">${LT[x.tipo]||x.tipo}</span><b>${esc(x.nome||x.email||'Sem nome')}</b><small style="color:var(--muted);margin-left:auto">${fmtD(x.criadoEm)}</small></div>
   <dl>${x.telefone?`<dt>Telefone</dt><dd>${esc(x.telefone)}</dd>`:''}${x.email?`<dt>E-mail</dt><dd>${esc(x.email)}</dd>`:''}${x.imovelTitulo?`<dt>Imóvel</dt><dd>${esc(x.imovelTitulo)}</dd>`:''}${x.data?`<dt>Visita</dt><dd><b>${esc(x.data.split('-').reverse().join('/'))} às ${esc(x.hora||'')}</b></dd>`:''}${x.assunto?`<dt>Assunto</dt><dd>${esc(x.assunto)}</dd>`:''}${x.finalidade?`<dt>Quer</dt><dd>${esc(x.finalidade)}</dd>`:''}${x.perfil?`<dt>Perfil</dt><dd>${esc(x.perfil)} · ${esc(x.faixa||'')}</dd>`:''}${x.dados?Object.entries(x.dados).filter(([,v])=>v).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join(''):''}</dl>
   ${x.mensagem?`<div class="msg">${esc(x.mensagem)}</div>`:''}
   <div class="acts">${tel?`<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${tel}?text=${encodeURIComponent('Olá, '+(x.nome||'')+'! Aqui é a Quézia Santos.')}">${ico('whatsapp')} WhatsApp</a>`:''}${x.email?`<a class="btn sm ghost" href="mailto:${esc(x.email)}">${ico('mail')} E-mail</a>`:''}
   <select data-s="${esc(x.id)}"><option>novo</option><option>em contato</option><option>concluído</option></select><button class="ib dng" data-d="${esc(x.id)}" aria-label="Excluir">${ico('trash')}</button></div></div>`}).join(''):'<div class="empty2">Nada por aqui.</div>'}`;
  $('#ls').value=ls;$('#ls').onchange=e=>{ls=e.target.value;vLeads(el)};
  $$('[data-t]',el).forEach(b=>b.onclick=()=>{lt=b.dataset.t;vLeads(el)});
  $$('[data-s]',el).forEach(s=>{const x=D.leads.find(l=>l.id===s.dataset.s);s.value=x.status;s.onchange=async()=>{x.status=s.value;await store.saveLead(x);shell()}});
  $$('[data-d]',el).forEach(b=>b.onclick=async()=>{if(!confirm('Excluir este contato?'))return;await store.deleteLead(b.dataset.d);D.leads=D.leads.filter(l=>l.id!==b.dataset.d);shell()});
  $('#csv').onclick=()=>{const c=['criadoEm','tipo','status','nome','telefone','email','imovelTitulo','data','hora','mensagem'];const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';download('contatos.csv',[c.join(','),...D.leads.map(x=>c.map(k=>q(x[k])).join(','))].join('\n'),'text/csv')};
}
function download(name,txt,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+txt],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}

/* ---------------- vídeos ---------------- */
function vVideos(el){
  const l=[...D.videos].sort((a,b)=>(a.ord||0)-(b.ord||0));
  el.innerHTML=`<h1>Vídeos</h1><p class="sub">Aparecem no portfólio e na página inicial. Cole o link do YouTube, de um Reel do Instagram ou de um arquivo .mp4.</p>
  <div class="bar"><button class="btn sm" id="nv">${ico('plus')} Novo vídeo</button></div>
  ${l.length?l.map((v,i)=>`<div class="row"><img class="th" src="${esc(img(v.capa||'art:'+v.id+':1'))}" alt=""><div><div class="t">${esc(v.titulo)}</div><div class="m"><span>${esc(v.url||'')}</span></div></div><div class="acts"><button class="ib" data-u="${i}" title="Subir">↑</button><button class="ib" data-w="${i}" title="Descer">↓</button><button class="ib" data-e="${esc(v.id)}">${ico('edit')}</button><button class="ib dng" data-x="${esc(v.id)}">${ico('trash')}</button></div></div>`).join(''):'<div class="empty2">Nenhum vídeo ainda. Adicione o primeiro!</div>'}`;
  $('#nv').onclick=()=>editVid();
  $$('[data-e]',el).forEach(b=>b.onclick=()=>editVid(D.videos.find(v=>v.id===b.dataset.e)));
  $$('[data-x]',el).forEach(b=>b.onclick=async()=>{if(!confirm('Excluir este vídeo?'))return;await store.deleteVideo(b.dataset.x);D.videos=D.videos.filter(v=>v.id!==b.dataset.x);vVideos(el)});
  const mv=async(i,d)=>{const j=i+d;if(j<0||j>=l.length)return;l.forEach((v,k)=>v.ord=k);[l[i].ord,l[j].ord]=[l[j].ord,l[i].ord];await store.saveVideo(l[i]);await store.saveVideo(l[j]);D.videos=await store.listVideos();vVideos(el)};
  $$('[data-u]',el).forEach(b=>b.onclick=()=>mv(+b.dataset.u,-1));$$('[data-w]',el).forEach(b=>b.onclick=()=>mv(+b.dataset.w,1));
}
function editVid(v){
  v=v?{...v}:{id:store.uid('v'),titulo:'',url:'',capa:'',tag:'Tour',imovelId:'',ord:D.videos.length};
  const m=modal(`<h3 style="margin-bottom:18px">${D.videos.some(x=>x.id===v.id)?'Editar':'Novo'} vídeo</h3><form id="vf" class="fg" style="grid-template-columns:1fr">
  <div class="fld"><label>Título</label><input name="titulo" required value="${esc(v.titulo)}"></div><div class="fld"><label>Link do vídeo</label><input name="url" required placeholder="https://www.instagram.com/reel/…  ou  https://youtu.be/…" value="${esc(v.url)}"></div>
  <div class="fld"><label>Etiqueta</label><input name="tag" value="${esc(v.tag||'')}"></div>
  <div class="fld"><label>Imóvel relacionado (opcional)</label><select name="imovelId"><option value="">—</option>${D.props.filter(p=>!p.offmarket).map(p=>`<option value="${esc(p.id)}">${esc(p.titulo)}</option>`).join('')}</select></div>
  <div class="fld"><label>Capa (opcional)</label><div style="display:flex;gap:12px;align-items:center"><img id="cv" src="${esc(img(v.capa||'art:'+v.id+':1'))}" style="width:90px;height:110px;object-fit:cover" alt=""><button type="button" class="btn sm ghost" id="cb">Escolher imagem</button></div></div>
  <button class="btn block" type="submit">Salvar vídeo</button></form>`);
  const f=$('#vf',m);f.imovelId.value=v.imovelId||'';
  $('#cb',m).onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=async()=>{try{v.capa=await store.uploadImage(i.files[0],{max:900});$('#cv',m).src=v.capa}catch(x){toast(x.message)}};i.click()};
  f.onsubmit=async e=>{e.preventDefault();Object.assign(v,{titulo:f.titulo.value.trim(),url:f.url.value.trim(),tag:f.tag.value.trim(),imovelId:f.imovelId.value});await store.saveVideo(v);m.close();D.videos=await store.listVideos();shell();toast('Vídeo salvo ✓')};
}

/* ---------------- meu site ---------------- */
function vSite(el){
  const S=D.S;const t=(n,l,x='',type='text')=>`<div class="fld ${x}"><label>${l}</label><input name="${n}" type="${type}" value="${esc(S[n]||'')}"></div>`;
  const ta=(n,l,r=4,hint='',val)=>`<div class="fld wf"><label>${l}</label><textarea name="${n}" rows="${r}">${esc(val!==undefined?val:Array.isArray(S[n])?S[n].join('\n'):(S[n]||''))}</textarea>${hint?`<small>${hint}</small>`:''}</div>`;
  el.innerHTML=`<h1>Meu site</h1><p class="sub">Tudo que aparece nas páginas públicas.</p>
  <form id="sf" class="box2"><div class="sect">Sua foto</div><div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap"><div class="avatar" id="av">${S.foto?`<img src="${esc(img(S.foto))}" alt="">`:esc((S.nome||'Q')[0])}</div><div><button type="button" class="btn sm" id="fb">${ico('up')} Enviar foto</button> ${S.foto?'<button type="button" class="btn sm ghost" id="fr">Remover</button>':''}<p style="font-size:13px;color:var(--muted);margin-top:8px;max-width:42ch">Use uma foto vertical, de meio corpo, com boa luz. Ela aparece em formato de arco na página inicial, no “Sobre” e no botão de contato.</p></div></div>
  <div class="sect">Identidade</div><div class="fg">${t('nome','Nome completo')}${t('marca','Nome na logo')}${t('titulo','Título (ex.: Corretora de Imóveis)')}${t('creci','CRECI')}${t('anos','Anos de mercado (opcional)')}</div>
  <div class="sect">Contatos</div><div class="fg">${t('whatsapp','WhatsApp (com DDD)','','tel')}${t('telefone','Telefone','','tel')}${t('email','E-mail','','email')}${t('endereco','Endereço de atendimento (opcional)','w2')}${t('cidade','Cidade')}${t('horario','Horário de atendimento','w2')}</div>
  <div class="sect">Redes sociais</div><div class="fg">${t('instagram','Instagram (usuário)')}${t('tiktok','TikTok (usuário)')}${t('youtube','YouTube (link ou @)')}${t('facebook','Facebook (link ou usuário)')}${t('linkedin','LinkedIn (link ou usuário)')}</div>
  <div class="sect">Textos da página inicial</div><div class="fg">${t('heroTitulo','Título (início)','w2')}${t('heroDestaque','Título (destaque em itálico)','w2')}<div class="fld wf"><label>Subtítulo</label><textarea name="heroSub" rows="2">${esc(S.heroSub||'')}</textarea></div></div>
  <div class="sect">Sobre você</div><div class="fg">${ta('bio','Sua história','7','Separe parágrafos com uma linha em branco.')}${ta('valores','Seus princípios (um por linha)',4)}${ta('regioes','Regiões / bairros que atende (um por linha)',5)}</div>
  <div class="sect">Depoimentos de clientes</div><div class="fg">${ta('depoimentos','Um por linha: Nome | Cargo ou bairro | Texto',4,'Só publique com autorização do cliente. Se ficar vazio, a seção não aparece.',(S.depoimentos||[]).map(d=>`${d.nome} | ${d.cargo||''} | ${d.texto}`).join('\n'))}</div>
  <p style="margin-top:22px"><button class="btn" type="submit">Salvar alterações</button></p></form>`;
  const f=$('#sf');
  $('#fb').onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=async()=>{try{toast('Enviando…');S.foto=await store.uploadImage(i.files[0],{max:1400,q:.88});await store.saveSettings(S);toast('Foto atualizada ✓');vSite(el)}catch(x){toast(x.message)}};i.click()};
  const fr=$('#fr');if(fr)fr.onclick=async()=>{S.foto='';await store.saveSettings(S);vSite(el)};
  f.onsubmit=async e=>{e.preventDefault();const g=n=>f[n].value.trim();
    ['nome','marca','titulo','creci','anos','whatsapp','telefone','email','endereco','cidade','horario','instagram','tiktok','youtube','facebook','linkedin','heroTitulo','heroDestaque','heroSub','bio'].forEach(n=>S[n]=g(n));
    S.instagram=S.instagram.replace(/^@/,'');S.valores=lines(f.valores.value);S.regioes=lines(f.regioes.value);
    S.depoimentos=lines(f.depoimentos.value).map(l=>{const [nome,cargo,...r]=l.split('|').map(s=>s.trim());return r.length?{nome,cargo,texto:r.join('|').trim()}:{nome:'',cargo:'',texto:l}}).filter(d=>d.texto);
    try{await store.saveSettings(S);toast('Site atualizado ✓')}catch(x){toast('Erro: '+x.message)}};
}

/* ---------------- conta ---------------- */
function vConta(el){
  el.innerHTML=`<h1>Conta e segurança</h1><p class="sub">${store.remote?'Conectada como <b>'+esc(store.userEmail())+'</b>.':'Modo demonstração (sem banco de dados).'}</p>
  ${store.remote?'':'<div class="hint bad"><b>Importante:</b> sem o banco de dados conectado, este painel NÃO é seguro nem compartilha nada com os visitantes do site. Siga o README (Supabase) antes de divulgar o endereço.</div>'}
  <div class="cols2"><div class="box2"><h3>Trocar senha</h3><form id="pw" class="fg" style="grid-template-columns:1fr"><div class="fld"><label>Nova senha (mínimo 8 caracteres)</label><input name="p1" type="password" minlength="8" required autocomplete="new-password"></div><div class="fld"><label>Repita a senha</label><input name="p2" type="password" minlength="8" required autocomplete="new-password"></div><button class="btn sm" type="submit">Trocar senha</button></form></div>
  <div class="box2"><h3>Backup</h3><p style="color:var(--muted);margin-bottom:14px;font-size:14px">Baixe uma cópia de todos os imóveis, contatos, vídeos e textos.</p><div class="bar"><button class="btn sm" id="ex">${ico('download')} Baixar backup</button><button class="btn sm ghost" id="im">${ico('up')} Restaurar backup</button></div></div></div>
  <div class="box2"><h3>Imóveis de exemplo</h3><p style="color:var(--muted);margin-bottom:14px;font-size:14px">O site vem com imóveis fictícios só para demonstrar o visual. Apague-os quando cadastrar os seus.</p><div class="bar"><button class="btn sm ghost dng" id="rm">${ico('trash')} Remover exemplos</button><button class="btn sm ghost" id="ld">Carregar exemplos</button></div></div>
  <div class="box2"><button class="btn ghost sm" id="lo2">${ico('out')} Sair do painel</button></div>`;
  $('#pw').onsubmit=async e=>{e.preventDefault();const f=e.target;if(f.p1.value!==f.p2.value)return toast('As senhas não coincidem');try{await store.changePassword(f.p1.value);f.reset();toast('Senha alterada ✓')}catch(x){toast(x.message)}};
  $('#ex').onclick=async()=>download('backup-quezia-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(await store.exportAll(),null,1),'application/json');
  $('#im').onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='.json';i.onchange=async()=>{try{if(!confirm('Restaurar este backup?'))return;await store.importAll(JSON.parse((await i.files[0].text()).replace(/^﻿/,'')));toast('Backup restaurado ✓');load()}catch(x){toast(x.message)}};i.click()};
  $('#rm').onclick=async()=>{if(!confirm('Remover todos os imóveis de exemplo?'))return;await store.removeExamples();toast('Exemplos removidos');await refresh()};
  $('#ld').onclick=async()=>{if(!confirm('Carregar os imóveis de exemplo?'))return;await store.loadExamples();toast('Exemplos carregados');await refresh()};
  $('#lo2').onclick=()=>{store.logout();location.reload()};
}
start();
})();

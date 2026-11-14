/* =========================================================
   Rede social do ILE — interface
   Fala apenas com `window.api` (js/store.js).
   ========================================================= */
(function(){
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl = u => { try{ const x = new URL(u); return ["http:","https:","mailto:"].includes(x.protocol) ? x.href : "#"; }catch(e){ return "#"; } };
const toast = msg => window.toast ? window.toast(msg) : alert(msg);
const C = api.constants;

let viewer = null;            // usuário logado
let feedScope = "all";        // "all" | "following"
let projKind = "";
let detailStack = [];         // pilha de telas de detalhe
let lastMainTab = "feed";
let composerImage = null;

/* ---------- utilidades ---------- */
function ago(isoStr){
  const s = Math.max(1, (Date.now() - new Date(isoStr)) / 1000);
  if(s < 60) return "agora";
  const m = s/60; if(m < 60) return Math.floor(m) + " min";
  const h = m/60; if(h < 24) return Math.floor(h) + " h";
  const d = h/24; if(d < 7) return Math.floor(d) + " d";
  return new Date(isoStr).toLocaleDateString("pt-BR", { day:"2-digit", month:"short" });
}
function richText(t){
  return esc(t).replace(/https?:\/\/[^\s<]+/g, u => {
    const clean = u.replace(/[.,;:!?)]+$/, ""); const tail = u.slice(clean.length);
    return `<a href="${safeUrl(clean.replace(/&amp;/g,"&"))}" target="_blank" rel="noopener">${clean}</a>${tail}`;
  }).replace(/\n/g, "<br>");
}
function initials(name){ return String(name||"?").split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase(); }
function avatar(u, size=40){
  return `<span class="av" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.38)}px" aria-hidden="true">${esc(initials(u?.name))}</span>`;
}
const roleLabel = r => r === "professor" ? "Docente" : "Estudante";
function roleBadge(u){ return `<span class="role ${u.role==="professor"?"doc":""}">${roleLabel(u.role)}</span>${u.is_mod?'<span class="role mod">Moderação</span>':""}`; }
async function run(fn, okMsg){
  try{ const r = await fn(); if(okMsg) toast(okMsg); return r; }
  catch(e){ toast(e.message || "Algo deu errado."); throw e; }
}
function resizeImage(file, max=1080){
  return new Promise((resolve, reject) => {
    if(!file.type.startsWith("image/")) return reject(new Error("Escolha um arquivo de imagem."));
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler a imagem.")); };
    img.src = url;
  });
}

/* ---------- navegação ---------- */
function openDetail(view, id, push=true){
  if(push) detailStack.push({ view, id });
  window.showTab("detail");
  const box = $("#detailBody"); box.innerHTML = '<div class="empty">Carregando…</div>';
  ({ project: renderProject, profile: renderProfile, post: renderPostPage, moderation: renderModeration,
     rules: renderRules, editProfile: renderEditProfile, newProject: renderNewProject })[view](id, box);
}
$("#detailBack").onclick = () => {
  detailStack.pop();
  const prev = detailStack[detailStack.length-1];
  if(prev) openDetail(prev.view, prev.id, false); else window.showTab(lastMainTab);
};
document.addEventListener("click", e => {
  const a = e.target.closest("[data-open]"); if(!a) return;
  e.preventDefault(); openDetail(a.dataset.open, a.dataset.id);
});

/* ---------- autenticação ---------- */
function authGate(box, reason){
  box.innerHTML = `
    <div class="card auth">
      <img src="logo-ile.png" alt="" width="64" height="64" class="auth-logo">
      <h1 style="text-align:center">Rede do ILE</h1>
      <p class="lead" style="text-align:center">${esc(reason || "Projetos, conversas e novidades de estudantes e docentes do Instituto de Letras.")}</p>
      <div class="seg" role="tablist">
        <button role="tab" aria-selected="true" data-auth="in">Entrar</button>
        <button role="tab" aria-selected="false" data-auth="up">Criar conta</button>
      </div>
      <form data-form="in">
        <label>E-mail institucional</label>
        <input name="email" type="email" required placeholder="seu.nome@graduacao.uerj.br" autocomplete="email">
        <button class="btn full" type="submit">Entrar</button>
      </form>
      <form data-form="up" hidden>
        <label>Nome completo</label><input name="name" required maxlength="80" autocomplete="name">
        <label>E-mail institucional</label><input name="email" type="email" required placeholder="seu.nome@graduacao.uerj.br" autocomplete="email">
        <div class="grid2">
          <div><label>Vínculo</label><select name="role"><option value="aluno">Estudante</option><option value="professor">Docente</option></select></div>
          <div><label>Curso / habilitação</label><select name="course">${C.COURSES.map(c=>`<option>${esc(c)}</option>`).join("")}</select></div>
        </div>
        <label class="check"><input type="checkbox" name="rules" required> Li e aceito as <a href="#" data-open="rules">regras de convivência</a></label>
        <button class="btn full" type="submit">Criar conta</button>
      </form>
      <p class="src" style="text-align:center;margin-top:10px">Só e-mails terminados em <b>uerj.br</b>. Na versão conectada ao servidor, você recebe um link de confirmação no e-mail.</p>
    </div>
    ${api.isDemo ? `<div class="card"><b style="font-size:.9rem">Modo demonstração</b>
      <p class="src">Experimente com uma conta de exemplo (pessoas fictícias):</p><div id="demoAccts" class="demo-accts"></div></div>` : ""}`;
  box.querySelectorAll("[data-auth]").forEach(b => b.onclick = () => {
    box.querySelectorAll("[data-auth]").forEach(x => x.setAttribute("aria-selected", x===b));
    box.querySelector('[data-form="in"]').hidden = b.dataset.auth !== "in";
    box.querySelector('[data-form="up"]').hidden = b.dataset.auth !== "up";
  });
  box.querySelector('[data-form="in"]').onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    await run(() => api.auth.signIn(f.email.value)).then(afterLogin).catch(()=>{});
  };
  box.querySelector('[data-form="up"]').onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    await run(() => api.auth.signUp({ name:f.name.value, email:f.email.value, role:f.role.value, course:f.course.value }), "Conta criada. Bem-vindo(a)!").then(afterLogin).catch(()=>{});
  };
  if(api.isDemo) api.auth.demoAccounts().then(list => {
    const el = box.querySelector("#demoAccts"); if(!el) return;
    el.innerHTML = list.map(u => `<button class="demo" data-demo="${u.id}">${avatar(u,34)}<span><b>${esc(u.name)}</b><small>${roleLabel(u.role)}${u.is_mod?" · moderação":""}</small></span></button>`).join("");
    el.onclick = ev => { const b = ev.target.closest("[data-demo]"); if(b) api.auth.signInAs(b.dataset.demo).then(afterLogin); };
  });
}
async function afterLogin(){ viewer = await api.auth.session(); refreshBadge(); window.showTab(lastMainTab === "perfil" ? "perfil" : lastMainTab); }

/* ---------- posts ---------- */
function postCard(p){
  const img = p.image ? `<img class="pimg" src="${p.image}" alt="Imagem do post" loading="lazy">` : "";
  const link = p.link ? `<a class="plink" href="${safeUrl(p.link)}" target="_blank" rel="noopener">↗ ${esc(p.link.replace(/^https?:\/\//,"").slice(0,60))}</a>` : "";
  return `<article class="sp" data-post="${p.id}">
    <div class="sp-h">
      <a href="#" data-open="profile" data-id="${p.author.id}">${avatar(p.author)}</a>
      <div class="grow">
        <a href="#" class="nm" data-open="profile" data-id="${p.author.id}">${esc(p.author.name)}</a> ${roleBadge(p.author)}
        <div class="m">${p.project ? `em <a href="#" data-open="project" data-id="${p.project.id}">${esc(p.project.name)}</a> · ` : ""}${ago(p.created_at)}</div>
      </div>
      <button class="more" data-menu="${p.id}" aria-label="Mais opções">⋯</button>
    </div>
    ${p.text ? `<div class="sp-t">${richText(p.text)}</div>` : ""}
    ${img}${link}
    <div class="sp-a">
      <button data-like="${p.id}" aria-pressed="${p.liked}" class="${p.liked?"on":""}">${p.liked?"♥":"♡"} <span>${p.like_count}</span></button>
      <button data-open="post" data-id="${p.id}">💬 <span>${p.comment_count}</span></button>
    </div>
    <div class="menu" data-menu-for="${p.id}" hidden>
      ${p.can_delete ? `<button data-del-post="${p.id}">Apagar post</button>` : ""}
      ${viewer && p.author.id !== viewer.id ? `<button data-report="${p.id}">Denunciar</button>` : ""}
      <button data-copy="${p.id}">Copiar texto</button>
    </div>
  </article>`;
}
async function postList(box, filter, empty){
  const list = await api.posts.list(filter);
  box.innerHTML = list.length ? list.map(postCard).join("") : `<div class="card empty">${empty}</div>`;
}
document.addEventListener("click", async e => {
  const t = e.target.closest("button"); if(!t) { document.querySelectorAll(".menu").forEach(m=>m.hidden=true); return; }
  if(t.dataset.like){
    const p = await run(() => api.posts.toggleLike(t.dataset.like)).catch(()=>null); if(!p) return;
    t.classList.toggle("on", p.liked); t.setAttribute("aria-pressed", p.liked); t.innerHTML = `${p.liked?"♥":"♡"} <span>${p.like_count}</span>`;
  } else if(t.dataset.menu){
    const m = document.querySelector(`[data-menu-for="${t.dataset.menu}"]`);
    const was = m.hidden; document.querySelectorAll(".menu").forEach(x=>x.hidden=true); m.hidden = !was;
  } else if(t.dataset.delPost){
    if(!confirm("Apagar este post? Isso não pode ser desfeito.")) return;
    await run(() => api.posts.remove(t.dataset.delPost), "Post apagado").catch(()=>{});
    document.querySelectorAll(`[data-post="${t.dataset.delPost}"]`).forEach(el=>el.remove());
    if(detailStack.length && detailStack[detailStack.length-1].view==="post") $("#detailBack").click();
  } else if(t.dataset.report){
    openReport(t.dataset.report);
  } else if(t.dataset.copy){
    const el = document.querySelector(`[data-post="${t.dataset.copy}"] .sp-t`);
    try{ await navigator.clipboard.writeText(el ? el.innerText : ""); toast("Texto copiado"); }catch(_){ toast("Não foi possível copiar"); }
  } else if(!t.closest(".menu")) document.querySelectorAll(".menu").forEach(m=>m.hidden=true);
});

/* denúncia */
function openReport(post_id){
  const d = $("#reportDlg");
  d.querySelector("#reportReasons").innerHTML = C.REPORT_REASONS.map((r,i)=>`<label class="check"><input type="radio" name="reason" value="${esc(r)}" ${i===0?"checked":""}> ${esc(r)}</label>`).join("");
  d.querySelector("form").onsubmit = async e => {
    e.preventDefault();
    if(e.submitter && e.submitter.value === "cancel"){ d.close(); return; }
    const reason = d.querySelector('input[name="reason"]:checked').value;
    await run(() => api.moderation.report(post_id, reason), "Denúncia enviada à moderação").catch(()=>{});
    d.close();
  };
  d.showModal();
}

/* ---------- FEED ---------- */
async function renderFeed(){
  const box = $("#feedBody");
  if(!viewer) return authGate(box);
  const projects = (await api.projects.list()).filter(p=>p.is_member);
  box.innerHTML = `
    ${api.isDemo ? '<div class="demo-banner">Modo demonstração: pessoas, posts e projetos são fictícios e ficam salvos só neste aparelho.</div>' : ""}
    <form class="card composer" id="composer">
      <div class="row" style="align-items:flex-start">${avatar(viewer)}
        <textarea id="cText" rows="3" maxlength="2000" placeholder="Compartilhe um projeto, uma leitura, uma dúvida…" aria-label="Texto do post"></textarea></div>
      <div id="cPreview"></div>
      <input id="cLink" type="url" placeholder="Link (opcional)" hidden>
      <div class="row composer-bar">
        <label class="tool" title="Adicionar imagem">🖼️<input id="cImg" type="file" accept="image/*" hidden></label>
        <button type="button" class="tool" id="cLinkBtn" title="Adicionar link">🔗</button>
        ${projects.length ? `<select id="cProj" aria-label="Publicar em projeto"><option value="">Meu perfil</option>${projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select>` : ""}
        <span class="grow"></span>
        <button class="btn" type="submit">Publicar</button>
      </div>
    </form>
    <div class="seg" style="margin:4px 0 10px">
      <button data-scope="all" aria-selected="${feedScope==="all"}">Todos</button>
      <button data-scope="following" aria-selected="${feedScope==="following"}">Seguindo</button>
    </div>
    <div id="feedList"></div>`;
  composerImage = null;
  $("#cLinkBtn").onclick = () => { const l = $("#cLink"); l.hidden = !l.hidden; if(!l.hidden) l.focus(); };
  $("#cImg").onchange = async e => {
    const f = e.target.files[0]; if(!f) return;
    composerImage = await run(() => resizeImage(f)).catch(()=>null);
    $("#cPreview").innerHTML = composerImage ? `<div class="cprev"><img src="${composerImage}" alt="Prévia"><button type="button" id="cRmImg" aria-label="Remover imagem">✕</button></div>` : "";
    const rm = $("#cRmImg"); if(rm) rm.onclick = () => { composerImage = null; $("#cPreview").innerHTML = ""; $("#cImg").value = ""; };
  };
  $("#composer").onsubmit = async e => {
    e.preventDefault();
    const link = $("#cLink").value.trim();
    if(link && safeUrl(link) === "#"){ toast("Link inválido"); return; }
    const p = await run(() => api.posts.create({ text: $("#cText").value, image: composerImage, link: link || null, project_id: $("#cProj")?.value || null }), "Publicado!").catch(()=>null);
    if(p) renderFeed();
  };
  box.querySelectorAll("[data-scope]").forEach(b => b.onclick = () => { feedScope = b.dataset.scope; renderFeed(); });
  await postList($("#feedList"), { scope: feedScope }, feedScope==="following" ? "Siga pessoas e projetos para ver as novidades deles aqui." : "Nenhum post ainda. Seja a primeira pessoa a publicar!");
}

/* ---------- PROJETOS ---------- */
function projectCard(p){
  return `<a href="#" class="card pcard" data-open="project" data-id="${p.id}">
    <div class="row"><span class="tag">${esc(p.kind)}</span><span class="grow"></span>${p.is_member?'<span class="src">você participa</span>':p.followed?'<span class="src">acompanhando</span>':""}</div>
    <b class="pname">${esc(p.name)}</b>
    <p class="pdesc">${esc(p.description)}</p>
    <div class="m">${p.member_count} ${p.member_count===1?"membro":"membros"} · ${p.follower_count} ${p.follower_count===1?"acompanha":"acompanham"}</div>
  </a>`;
}
async function renderProjects(){
  const box = $("#projBody");
  if(!viewer) return authGate(box, "Entre para conhecer e acompanhar os projetos do Instituto.");
  box.innerHTML = `
    <div class="row" style="gap:8px;margin-bottom:10px">
      <input type="search" id="projQ" placeholder="Buscar projetos…" aria-label="Buscar projetos" class="grow">
      <button class="btn" data-open="newProject">+ Novo</button>
    </div>
    <div class="chips" id="projChips">${["", ...C.PROJECT_KINDS].map(k=>`<button class="chip" data-kind="${esc(k)}" aria-pressed="${k===projKind}">${k?esc(k):"Todos"}</button>`).join("")}</div>
    <div id="projList" style="margin-top:10px"></div>`;
  const draw = async () => {
    const list = await api.projects.list({ q: $("#projQ").value, kind: projKind });
    $("#projList").innerHTML = list.length ? list.map(projectCard).join("") : '<div class="card empty">Nenhum projeto encontrado.</div>';
  };
  $("#projQ").oninput = draw;
  $("#projChips").onclick = e => { const b = e.target.closest("[data-kind]"); if(!b) return; projKind = b.dataset.kind;
    box.querySelectorAll("#projChips .chip").forEach(c=>c.setAttribute("aria-pressed", c===b)); draw(); };
  draw();
}
async function renderProject(id, box){
  const p = await api.projects.get(id).catch(e => { box.innerHTML = `<div class="card empty">${esc(e.message)}</div>`; });
  if(!p) return;
  box.innerHTML = `
    <div class="card">
      <span class="tag">${esc(p.kind)}</span>
      <h1 style="margin-top:8px">${esc(p.name)}</h1>
      <p style="white-space:pre-line">${esc(p.description)}</p>
      <div class="m" style="margin:8px 0 12px">Coordenação: <a href="#" data-open="profile" data-id="${p.owner.id}">${esc(p.owner.name)}</a> · ${p.follower_count} ${p.follower_count===1?"acompanha":"acompanham"}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        ${viewer ? `<button class="btn ${p.followed?"ghost":""}" id="pFollow">${p.followed?"✓ Acompanhando":"Acompanhar"}</button>` : ""}
        ${p.is_member && !p.is_owner ? '<button class="btn ghost" id="pLeave">Sair do projeto</button>' : ""}
      </div>
    </div>
    <h2>Participantes</h2>
    <div class="card">${p.members.map(m=>`<div class="item"><a href="#" data-open="profile" data-id="${m.id}">${avatar(m,36)}</a><div class="grow"><a href="#" class="nm" data-open="profile" data-id="${m.id}">${esc(m.name)}</a><div class="m">${esc(m.member_role)} · ${roleLabel(m.role)}</div></div></div>`).join("")}
      ${p.is_owner ? `<form id="addMember" class="row" style="gap:8px;margin-top:10px"><input id="memberQ" placeholder="Adicionar pessoa pelo nome…" class="grow" list="memberOpts" aria-label="Nome da pessoa"><datalist id="memberOpts"></datalist><button class="btn small">Adicionar</button></form>` : ""}
    </div>
    <h2>Atualizações</h2>
    <div id="projPosts"></div>`;
  const fb = box.querySelector("#pFollow"); if(fb) fb.onclick = async () => { await run(() => api.follows.toggle("project", id)).catch(()=>{}); renderProject(id, box); };
  const lb = box.querySelector("#pLeave"); if(lb) lb.onclick = async () => { if(confirm("Sair deste projeto?")){ await run(() => api.projects.leave(id), "Você saiu do projeto").catch(()=>{}); renderProject(id, box); } };
  const am = box.querySelector("#addMember");
  if(am){
    let found = [];
    box.querySelector("#memberQ").oninput = async e => { found = await api.profiles.search(e.target.value); box.querySelector("#memberOpts").innerHTML = found.map(u=>`<option value="${esc(u.name)}">`).join(""); };
    am.onsubmit = async e => { e.preventDefault();
      const u = found.find(x=>x.name.toLowerCase()===box.querySelector("#memberQ").value.trim().toLowerCase());
      if(!u) return toast("Escolha uma pessoa da lista.");
      await run(() => api.projects.addMember(id, u.id), "Participante adicionado").catch(()=>{}); renderProject(id, box); };
  }
  await postList(box.querySelector("#projPosts"), { project_id: id }, "Ainda não há atualizações neste projeto.");
}
function renderNewProject(_, box){
  if(!viewer) return authGate(box);
  box.innerHTML = `<form class="card" id="npForm">
    <h1>Novo projeto</h1>
    <p class="lead">Pesquisa, extensão, IC, grupo de estudo… Você fica como coordenação e pode adicionar participantes.</p>
    <label>Nome</label><input name="name" required maxlength="100">
    <label>Tipo</label><select name="kind">${C.PROJECT_KINDS.map(k=>`<option>${esc(k)}</option>`).join("")}</select>
    <label>Descrição</label><textarea name="description" rows="5" required maxlength="1500" placeholder="Objetivo, quem pode participar, horários, como entrar em contato…"></textarea>
    <button class="btn full" style="margin-top:12px">Criar projeto</button></form>`;
  box.querySelector("#npForm").onsubmit = async e => { e.preventDefault(); const f = e.target;
    const p = await run(() => api.projects.create({ name:f.name.value, kind:f.kind.value, description:f.description.value }), "Projeto criado").catch(()=>null);
    if(p){ detailStack.pop(); openDetail("project", p.id); } };
}

/* ---------- post + comentários ---------- */
async function renderPostPage(id, box){
  const p = await api.posts.get(id).catch(e => { box.innerHTML = `<div class="card empty">${esc(e.message)}</div>`; });
  if(!p) return;
  const draw = async () => {
    const cs = await api.comments.list(id);
    box.querySelector("#cmts").innerHTML = cs.length ? cs.map(c=>`<div class="item"><a href="#" data-open="profile" data-id="${c.author.id}">${avatar(c.author,34)}</a>
      <div class="grow"><a href="#" class="nm" data-open="profile" data-id="${c.author.id}">${esc(c.author.name)}</a> <span class="m">· ${ago(c.created_at)}</span>
      <div class="ctext">${richText(c.text)}</div>${c.can_delete?`<button class="linkbtn" data-del-c="${c.id}">apagar</button>`:""}</div></div>`).join("")
      : '<div class="empty">Nenhum comentário ainda.</div>';
  };
  box.innerHTML = `${postCard(p)}<h2>Comentários</h2><div class="card"><div id="cmts"></div>
    ${viewer ? `<form id="cForm" class="row" style="gap:8px;margin-top:10px;align-items:flex-end"><textarea id="cInput" rows="1" maxlength="1000" placeholder="Escreva um comentário…" class="grow" aria-label="Comentário"></textarea><button class="btn small">Enviar</button></form>` : ""}</div>`;
  box.querySelector("#cmts").onclick = async e => { const b = e.target.closest("[data-del-c]"); if(!b) return;
    if(confirm("Apagar comentário?")){ await run(() => api.comments.remove(b.dataset.delC)).catch(()=>{}); draw(); } };
  const f = box.querySelector("#cForm"); if(f) f.onsubmit = async e => { e.preventDefault();
    const c = await run(() => api.comments.add(id, box.querySelector("#cInput").value)).catch(()=>null); if(c){ box.querySelector("#cInput").value = ""; draw(); } };
  draw();
}

/* ---------- perfil ---------- */
async function renderProfile(id, box){
  const u = await api.profiles.get(id).catch(e => { box.innerHTML = `<div class="card empty">${esc(e.message)}</div>`; });
  if(!u) return;
  box.innerHTML = `
    <div class="card prof">
      <div class="row">${avatar(u, 72)}
        <div class="grow stats">
          <div><b>${u.post_count}</b><small>posts</small></div>
          <div><b>${u.followers}</b><small>seguidores</small></div>
          <div><b>${u.following}</b><small>seguindo</small></div>
        </div>
      </div>
      <div class="pn">${esc(u.name)}</div>
      <div class="m">${roleBadge(u)} ${esc(u.course)}</div>
      ${u.bio ? `<p class="bio">${esc(u.bio)}</p>` : ""}
      <div class="row" style="gap:8px;margin-top:10px">
        ${u.is_me ? '<button class="btn ghost grow" data-open="editProfile">Editar perfil</button>'
          : viewer ? `<button class="btn grow ${u.followed?"ghost":""}" id="uFollow">${u.followed?"Seguindo":"Seguir"}</button>` : ""}
      </div>
    </div>
    ${u.projects.length ? `<h2>Projetos</h2><div class="card">${u.projects.map(p=>`<div class="item"><div class="grow"><a href="#" class="nm" data-open="project" data-id="${p.id}">${esc(p.name)}</a><div class="m">${esc(p.member_role)} · ${esc(p.kind)}</div></div></div>`).join("")}</div>` : ""}
    <h2>Posts</h2><div id="uPosts"></div>`;
  const fb = box.querySelector("#uFollow"); if(fb) fb.onclick = async () => { await run(() => api.follows.toggle("user", id)).catch(()=>{}); renderProfile(id, box); };
  await postList(box.querySelector("#uPosts"), { author_id: id }, "Nenhum post ainda.");
}
async function renderMe(){
  const box = $("#meBody");
  if(!viewer) return authGate(box);
  box.innerHTML = '<div id="meProfile"></div>';
  await renderProfile(viewer.id, $("#meProfile"));
  const menu = document.createElement("div");
  menu.innerHTML = `<h2>Conta</h2><div class="card menu-list">
    ${viewer.is_mod ? '<button data-open="moderation">🛡️ Painel de moderação</button>' : ""}
    <button data-open="rules">📜 Regras de convivência</button>
    <button id="logout">↩︎ Sair</button>
    ${api.isDemo ? '<button id="resetDemo" class="danger">Reiniciar dados de demonstração</button>' : ""}
  </div>`;
  box.appendChild(menu);
  $("#logout").onclick = async () => { await api.auth.signOut(); viewer = null; refreshBadge(); renderMe(); };
  const rd = $("#resetDemo"); if(rd) rd.onclick = async () => { if(confirm("Apagar tudo o que foi criado e voltar aos dados de exemplo?")){ await api.resetDemo(); viewer = null; refreshBadge(); toast("Demonstração reiniciada"); renderMe(); } };
}
function renderEditProfile(_, box){
  if(!viewer) return authGate(box);
  box.innerHTML = `<form class="card" id="epForm"><h1>Editar perfil</h1>
    <label>Nome</label><input name="name" required maxlength="80" value="${esc(viewer.name)}">
    <label>Curso / habilitação</label><select name="course">${C.COURSES.map(c=>`<option ${c===viewer.course?"selected":""}>${esc(c)}</option>`).join("")}</select>
    <label>Sobre você</label><textarea name="bio" rows="4" maxlength="300" placeholder="Interesses, pesquisa, o que você estuda…">${esc(viewer.bio)}</textarea>
    <button class="btn full" style="margin-top:12px">Salvar</button></form>`;
  box.querySelector("#epForm").onsubmit = async e => { e.preventDefault(); const f = e.target;
    const u = await run(() => api.profiles.update({ name:f.name.value, course:f.course.value, bio:f.bio.value }), "Perfil atualizado").catch(()=>null);
    if(u){ viewer = u; $("#detailBack").click(); } };
}

/* ---------- notificações ---------- */
const NOTIF_TEXT = {
  like: n => `curtiu seu post`,
  comment: n => `comentou no seu post`,
  follow: n => `começou a seguir você`,
  project_post: n => `publicou em ${esc(n.project?.name || "um projeto")}`,
  project_follow: n => `passou a acompanhar ${esc(n.project?.name || "seu projeto")}`,
  member_added: n => `adicionou você ao projeto ${esc(n.project?.name || "")}`,
  post_hidden: n => `(moderação) ocultou um post seu por violar as regras`
};
async function renderNotifs(){
  const box = $("#notifBody");
  if(!viewer) return authGate(box, "Entre para ver suas notificações.");
  const list = await api.notifications.list();
  box.innerHTML = `<div class="row" style="justify-content:flex-end;margin-bottom:8px"><button class="btn ghost small" id="readAll">Marcar todas como lidas</button></div>
    <div class="card">${list.length ? list.map(n => {
      const target = n.post_id && n.type!=="post_hidden" ? `data-open="post" data-id="${n.post_id}"` : n.project_id ? `data-open="project" data-id="${n.project_id}"` : `data-open="profile" data-id="${n.actor?.id}"`;
      return `<a href="#" class="item notif ${n.read?"":"unread"}" ${target}>${avatar(n.actor,38)}<div class="grow"><b>${esc(n.actor?.name || "Alguém")}</b> ${(NOTIF_TEXT[n.type]||(()=>"interagiu"))(n)}<div class="m">${ago(n.created_at)}</div></div></a>`;
    }).join("") : '<div class="empty">Nada por aqui ainda.</div>'}</div>`;
  $("#readAll").onclick = async () => { await api.notifications.markAllRead(); refreshBadge(); renderNotifs(); };
}
async function refreshBadge(){
  const n = await api.notifications.unreadCount();
  const b = $("#notifBadge"); b.textContent = n > 9 ? "9+" : n; b.hidden = !n;
}

/* ---------- moderação e regras ---------- */
async function renderModeration(_, box){
  const q = await api.moderation.queue().catch(e => { box.innerHTML = `<div class="card empty">${esc(e.message)}</div>`; });
  if(!q) return;
  box.innerHTML = `<h1>Moderação</h1><p class="lead">Denúncias abertas. Ocultar remove o post do feed de todos e avisa quem publicou.</p>
    ${q.length ? q.map(r => `<div class="card">
      <div class="m"><b>${esc(r.reason)}</b> · denunciado por ${esc(r.reporter?.name)} · ${ago(r.created_at)}</div>
      ${r.post ? `<blockquote class="quote"><b>${esc(r.post.author?.name)}:</b> ${richText(r.post.text || "(imagem)")}</blockquote>` : '<p class="m">Post já removido.</p>'}
      <div class="row" style="gap:8px"><button class="btn small" data-hide="${r.id}">Ocultar post</button><button class="btn ghost small" data-dismiss="${r.id}">Descartar denúncia</button></div>
    </div>`).join("") : '<div class="card empty">Nenhuma denúncia aberta. 🎉</div>'}`;
  box.onclick = async e => {
    const b = e.target.closest("[data-hide],[data-dismiss]"); if(!b) return;
    await run(() => api.moderation.resolve(b.dataset.hide || b.dataset.dismiss, b.dataset.hide ? "hide" : "dismiss"), b.dataset.hide ? "Post ocultado" : "Denúncia descartada").catch(()=>{});
    renderModeration(_, box);
  };
}
function renderRules(_, box){
  box.innerHTML = `<div class="card rules"><h1>Regras de convivência</h1>
    <p>A Rede do ILE é um espaço para estudantes e docentes do Instituto de Letras compartilharem projetos, leituras e oportunidades.</p>
    <ol>
      <li><b>Respeito acima de tudo.</b> Nada de assédio, ofensas, discriminação ou discurso de ódio.</li>
      <li><b>Seja você.</b> Contas são pessoais e vinculadas ao e-mail institucional.</li>
      <li><b>Cuide das informações.</b> Não divulgue dados pessoais de outras pessoas nem informações falsas.</li>
      <li><b>Sem spam.</b> Divulgação comercial repetitiva ou fora do contexto acadêmico pode ser removida.</li>
      <li><b>Créditos e autoria.</b> Cite fontes e respeite direitos autorais ao compartilhar textos e imagens.</li>
      <li><b>Denuncie.</b> Use “⋯ → Denunciar” em posts que violem estas regras. A moderação analisa cada caso.</li>
    </ol>
    <p class="src">Este não é um canal oficial do ILE ou da UERJ.</p></div>`;
}

/* ---------- ganchos com o roteador do index.html ---------- */
window.onTabShown = name => {
  if(["feed","projetos","notif","perfil"].includes(name)){ lastMainTab = name; detailStack = []; }
  if(name==="feed") renderFeed();
  if(name==="projetos") renderProjects();
  if(name==="notif") renderNotifs();
  if(name==="perfil") renderMe();
};
window.socialReady = (async () => { viewer = await api.auth.session(); refreshBadge(); })();
})();

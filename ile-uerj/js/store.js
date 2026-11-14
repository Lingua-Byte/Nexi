/* =========================================================
   Camada de dados da rede social — MODO DEMONSTRAÇÃO
   ---------------------------------------------------------
   Tudo fica no localStorage deste aparelho. A interface só
   conversa com o objeto `api` abaixo, e todas as funções são
   assíncronas (retornam Promise). Para ligar ao Supabase,
   basta reescrever estas funções com o cliente supabase-js,
   mantendo os mesmos nomes e formatos de retorno. O esquema
   equivalente está em supabase/schema.sql.
   ========================================================= */
(function(){
const DB_KEY = "ile-social-db-v1";
const SESSION_KEY = "ile-social-session";

/* E-mail institucional: @uerj.br ou subdomínios (ex.: @graduacao.uerj.br) */
const UERJ_EMAIL = /^[^\s@]+@([a-z0-9-]+\.)*uerj\.br$/i;

const COURSES = ["Português-Literaturas","Português-Inglês","Português-Francês","Português-Espanhol",
  "Português-Alemão","Português-Italiano","Português-Latim","Português-Grego","Português-Japonês",
  "Pós-graduação","Outro"];
const PROJECT_KINDS = ["Pesquisa","Extensão","Iniciação científica","Grupo de estudo","Monitoria","Evento","Outro"];
const REPORT_REASONS = ["Spam ou propaganda","Assédio ou discurso de ódio","Informação falsa","Conteúdo impróprio","Outro"];

const now = Date.now(), H = 3600e3, D = 24*H;
const iso = t => new Date(t).toISOString();

function seed(){
  const users = [
    { id:"u1", email:"beatriz.lima@graduacao.uerj.br", name:"Beatriz Lima", role:"aluno", course:"Português-Francês", bio:"Leitora de Clarice e de Duras. Monitora de Francês II.", is_mod:false },
    { id:"u2", email:"ricardo.alves@uerj.br", name:"Ricardo Alves", role:"professor", course:"Outro", bio:"Professor de Linguística. Coordeno o Atlas de variação linguística no Rio.", is_mod:false },
    { id:"u3", email:"camila.rocha@graduacao.uerj.br", name:"Camila Rocha", role:"aluno", course:"Português-Inglês", bio:"Tradução literária e legendagem. Moderadora da rede.", is_mod:true },
    { id:"u4", email:"diego.martins@graduacao.uerj.br", name:"Diego Martins", role:"aluno", course:"Português-Latim", bio:"IC em tradução de poesia latina.", is_mod:false }
  ].map(u => ({ ...u, created_at: iso(now-30*D) }));
  const projects = [
    { id:"p1", name:"Leituras de Clarice", kind:"Grupo de estudo", owner_id:"u1",
      description:"Grupo quinzenal de leitura e discussão da obra de Clarice Lispector. Aberto a todos os cursos.", created_at: iso(now-20*D) },
    { id:"p2", name:"Atlas de variação linguística no Rio", kind:"Pesquisa", owner_id:"u2",
      description:"Mapeamento de variantes fonéticas e lexicais em bairros do Rio de Janeiro, com coleta de entrevistas.", created_at: iso(now-25*D) },
    { id:"p3", name:"Tradução de poesia latina", kind:"Iniciação científica", owner_id:"u4",
      description:"Traduções comentadas de Catulo e Horácio para o português contemporâneo.", created_at: iso(now-15*D) }
  ];
  const project_members = [
    { project_id:"p1", user_id:"u1", role:"coordenação" }, { project_id:"p1", user_id:"u3", role:"membro" },
    { project_id:"p2", user_id:"u2", role:"coordenação" }, { project_id:"p2", user_id:"u1", role:"membro" },
    { project_id:"p3", user_id:"u4", role:"coordenação" }, { project_id:"p3", user_id:"u2", role:"orientação" }
  ];
  const posts = [
    { id:"s1", author_id:"u2", project_id:"p2", text:"Abrimos 4 vagas para bolsistas de IC no Atlas. Não é preciso experiência prévia com fonética, só vontade de ir a campo. Interessados, comentem aqui ou me procurem na sala da coordenação.", created_at: iso(now-3*H) },
    { id:"s2", author_id:"u1", project_id:"p1", text:"Próximo encontro: “A hora da estrela”, capítulos 1 a 3. Quinta, 17h, sala de leitura do 11º andar. Tragam suas anotações!", created_at: iso(now-9*H) },
    { id:"s3", author_id:"u4", project_id:"p3", text:"Primeira versão da tradução do Carmen 5 de Catulo (“Vivamus, mea Lesbia, atque amemus”). Críticas são muito bem-vindas.", link:"https://www.thelatinlibrary.com/catullus.shtml", created_at: iso(now-1*D) },
    { id:"s4", author_id:"u3", text:"Alguém tem indicação de material sobre legendagem para quem está começando? Estou montando uma lista para o pessoal de Inglês.", created_at: iso(now-2*D) },
    { id:"s5", author_id:"u2", text:"Lembrete aos alunos de Linguística I: a entrega do trabalho de transcrição fonética foi prorrogada por uma semana.", created_at: iso(now-3*D) }
  ].map(p => ({ link:null, image:null, project_id:null, hidden:false, ...p }));
  const comments = [
    { id:"c1", post_id:"s1", author_id:"u1", text:"Tenho interesse! Posso conciliar com a monitoria?", created_at: iso(now-2*H) },
    { id:"c2", post_id:"s1", author_id:"u2", text:"Pode sim, Beatriz. A carga é de 12h semanais.", created_at: iso(now-1*H) },
    { id:"c3", post_id:"s3", author_id:"u2", text:"Belo trabalho com o ritmo do segundo verso. Vamos discutir na orientação.", created_at: iso(now-20*H) },
    { id:"c4", post_id:"s4", author_id:"u4", text:"O pessoal do Lire Ensemble comentou sobre oficinas de tradução, vale perguntar.", created_at: iso(now-40*H) }
  ];
  const likes = [ ["s1","u1"],["s1","u3"],["s1","u4"],["s2","u3"],["s3","u2"],["s3","u1"],["s4","u1"],["s5","u4"] ]
    .map(([post_id,user_id]) => ({ post_id, user_id }));
  const follows = [
    ["u1","project","p2"],["u1","user","u2"],["u3","project","p1"],["u4","user","u2"],["u2","project","p3"],["u3","user","u1"]
  ].map(([follower_id,target_type,target_id]) => ({ follower_id, target_type, target_id }));
  const notifications = [
    { id:"n1", user_id:"u2", type:"comment", actor_id:"u1", post_id:"s1", created_at: iso(now-2*H), read:false },
    { id:"n2", user_id:"u2", type:"like", actor_id:"u3", post_id:"s1", created_at: iso(now-150*60e3), read:false },
    { id:"n3", user_id:"u1", type:"follow", actor_id:"u3", created_at: iso(now-5*D), read:true },
    { id:"n4", user_id:"u1", type:"project_post", actor_id:"u2", post_id:"s1", project_id:"p2", created_at: iso(now-3*H), read:false },
    { id:"n5", user_id:"u4", type:"comment", actor_id:"u2", post_id:"s3", created_at: iso(now-20*H), read:false }
  ];
  const reports = [
    { id:"r1", post_id:"s4", reporter_id:"u4", reason:"Spam ou propaganda", created_at: iso(now-30*H), status:"aberta" }
  ];
  return { users, projects, project_members, posts, comments, likes, follows, notifications, reports };
}

let db;
function load(){
  try{ db = JSON.parse(localStorage.getItem(DB_KEY)); }catch(e){ db = null; }
  if(!db || !db.users) { db = seed(); save(); }
}
function save(){
  try{ localStorage.setItem(DB_KEY, JSON.stringify(db)); }
  catch(e){ throw new Error("Sem espaço no aparelho. Tente uma imagem menor ou apague posts antigos."); }
}
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const ok = v => Promise.resolve(JSON.parse(JSON.stringify(v ?? null)));
const fail = msg => Promise.reject(new Error(msg));
function me(){ try{ return localStorage.getItem(SESSION_KEY); }catch(e){ return null; } }
function need(){ const id = me(); if(!id || !db.users.find(u=>u.id===id)) throw new Error("Entre na sua conta para continuar."); return id; }
function user(id){ return db.users.find(u=>u.id===id); }
function publicUser(u){ if(!u) return null; const { email, ...rest } = u; return rest; }
function notify(user_id, data){
  if(!user_id || user_id === data.actor_id) return;
  db.notifications.push({ id: uid("n"), user_id, created_at: iso(Date.now()), read:false, ...data });
}
function decoratePost(p, viewer){
  const project = p.project_id ? db.projects.find(x=>x.id===p.project_id) : null;
  return { ...p,
    author: publicUser(user(p.author_id)),
    project: project ? { id: project.id, name: project.name } : null,
    like_count: db.likes.filter(l=>l.post_id===p.id).length,
    comment_count: db.comments.filter(c=>c.post_id===p.id).length,
    liked: !!viewer && db.likes.some(l=>l.post_id===p.id && l.user_id===viewer),
    can_delete: !!viewer && (p.author_id===viewer || user(viewer)?.is_mod)
  };
}
function isFollowing(follower, type, id){ return db.follows.some(f=>f.follower_id===follower && f.target_type===type && f.target_id===id); }

load();

window.api = {
  constants: { COURSES, PROJECT_KINDS, REPORT_REASONS, UERJ_EMAIL },
  isDemo: true,

  auth: {
    async session(){ const id = me(); const u = id && user(id); return ok(u || null); },
    async signUp({ email, name, role, course }){
      email = String(email||"").trim().toLowerCase(); name = String(name||"").trim();
      if(!UERJ_EMAIL.test(email)) return fail("Use seu e-mail institucional da UERJ (terminado em uerj.br).");
      if(name.length < 3) return fail("Informe seu nome completo.");
      if(db.users.some(u=>u.email===email)) return fail("Já existe uma conta com este e-mail. Use “Entrar”.");
      const u = { id: uid("u"), email, name, role: role==="professor"?"professor":"aluno", course: course||"Outro", bio:"", is_mod:false, created_at: iso(Date.now()) };
      db.users.push(u); save(); localStorage.setItem(SESSION_KEY, u.id); return ok(u);
    },
    async signIn(email){
      email = String(email||"").trim().toLowerCase();
      if(!UERJ_EMAIL.test(email)) return fail("Use seu e-mail institucional da UERJ (terminado em uerj.br).");
      const u = db.users.find(x=>x.email===email);
      if(!u) return fail("Não encontramos conta com este e-mail. Crie a sua em “Criar conta”.");
      localStorage.setItem(SESSION_KEY, u.id); return ok(u);
    },
    async demoAccounts(){ return ok(db.users.filter(u=>["u1","u2","u3","u4"].includes(u.id)).map(u=>({ id:u.id, name:u.name, role:u.role, is_mod:u.is_mod, email:u.email }))); },
    async signInAs(id){ if(!user(id)) return fail("Conta não encontrada."); localStorage.setItem(SESSION_KEY, id); return ok(user(id)); },
    async signOut(){ localStorage.removeItem(SESSION_KEY); return ok(true); }
  },

  profiles: {
    async get(id){
      const u = user(id); if(!u) return fail("Perfil não encontrado.");
      const viewer = me();
      return ok({ ...publicUser(u),
        followers: db.follows.filter(f=>f.target_type==="user" && f.target_id===id).length,
        following: db.follows.filter(f=>f.follower_id===id).length,
        post_count: db.posts.filter(p=>p.author_id===id && !p.hidden).length,
        projects: db.project_members.filter(m=>m.user_id===id).map(m=>({ ...db.projects.find(p=>p.id===m.project_id), member_role:m.role })),
        is_me: viewer===id,
        followed: !!viewer && isFollowing(viewer,"user",id)
      });
    },
    async update(fields){
      const id = need(); const u = user(id);
      if(fields.name !== undefined){ const n = String(fields.name).trim(); if(n.length<3) return fail("Nome muito curto."); u.name = n.slice(0,80); }
      if(fields.bio !== undefined) u.bio = String(fields.bio).slice(0,300);
      if(fields.course !== undefined) u.course = COURSES.includes(fields.course) ? fields.course : "Outro";
      save(); return ok(u);
    },
    async search(q){
      q = String(q||"").toLowerCase().trim(); if(!q) return ok([]);
      return ok(db.users.filter(u=>(u.name+" "+u.course).toLowerCase().includes(q)).slice(0,20).map(publicUser));
    }
  },

  posts: {
    /* filter: { scope:"all"|"following", author_id, project_id } */
    async list(filter={}){
      const viewer = me();
      let list = db.posts.filter(p=>!p.hidden);
      if(filter.author_id) list = list.filter(p=>p.author_id===filter.author_id);
      if(filter.project_id) list = list.filter(p=>p.project_id===filter.project_id);
      if(filter.scope==="following" && viewer){
        list = list.filter(p => p.author_id===viewer || isFollowing(viewer,"user",p.author_id) || (p.project_id && isFollowing(viewer,"project",p.project_id)));
      }
      list.sort((a,b)=>b.created_at.localeCompare(a.created_at));
      return ok(list.map(p=>decoratePost(p, viewer)));
    },
    async get(id){ const p = db.posts.find(x=>x.id===id && !x.hidden); return p ? ok(decoratePost(p, me())) : fail("Post não encontrado ou removido."); },
    async create({ text, image, link, project_id }){
      const viewer = need();
      text = String(text||"").trim();
      if(!text && !image) return fail("Escreva algo ou adicione uma imagem.");
      if(text.length > 2000) return fail("Texto muito longo (máx. 2000 caracteres).");
      if(project_id && !db.project_members.some(m=>m.project_id===project_id && m.user_id===viewer)) return fail("Você só pode publicar em projetos dos quais participa.");
      const p = { id: uid("s"), author_id: viewer, project_id: project_id||null, text, image: image||null, link: link||null, hidden:false, created_at: iso(Date.now()) };
      db.posts.push(p);
      if(p.project_id){
        db.follows.filter(f=>f.target_type==="project" && f.target_id===p.project_id)
          .forEach(f=>notify(f.follower_id, { type:"project_post", actor_id: viewer, post_id: p.id, project_id: p.project_id }));
      }
      try{ save(); }catch(e){ db.posts.pop(); return fail(e.message); }
      return ok(decoratePost(p, viewer));
    },
    async remove(id){
      const viewer = need(); const p = db.posts.find(x=>x.id===id);
      if(!p) return fail("Post não encontrado.");
      if(p.author_id!==viewer && !user(viewer).is_mod) return fail("Você não pode apagar este post.");
      db.posts = db.posts.filter(x=>x.id!==id); db.comments = db.comments.filter(c=>c.post_id!==id);
      db.likes = db.likes.filter(l=>l.post_id!==id); save(); return ok(true);
    },
    async toggleLike(id){
      const viewer = need(); const p = db.posts.find(x=>x.id===id); if(!p) return fail("Post não encontrado.");
      const i = db.likes.findIndex(l=>l.post_id===id && l.user_id===viewer);
      if(i>=0) db.likes.splice(i,1);
      else { db.likes.push({ post_id:id, user_id:viewer }); notify(p.author_id, { type:"like", actor_id:viewer, post_id:id }); }
      save(); return ok(decoratePost(p, viewer));
    }
  },

  comments: {
    async list(post_id){
      return ok(db.comments.filter(c=>c.post_id===post_id).sort((a,b)=>a.created_at.localeCompare(b.created_at))
        .map(c=>({ ...c, author: publicUser(user(c.author_id)), can_delete: me()===c.author_id || !!user(me())?.is_mod })));
    },
    async add(post_id, text){
      const viewer = need(); text = String(text||"").trim();
      if(!text) return fail("Escreva um comentário."); if(text.length>1000) return fail("Comentário muito longo.");
      const p = db.posts.find(x=>x.id===post_id && !x.hidden); if(!p) return fail("Post não encontrado.");
      const c = { id: uid("c"), post_id, author_id: viewer, text, created_at: iso(Date.now()) };
      db.comments.push(c); notify(p.author_id, { type:"comment", actor_id:viewer, post_id }); save();
      return ok({ ...c, author: publicUser(user(viewer)), can_delete:true });
    },
    async remove(id){
      const viewer = need(); const c = db.comments.find(x=>x.id===id); if(!c) return fail("Comentário não encontrado.");
      if(c.author_id!==viewer && !user(viewer).is_mod) return fail("Você não pode apagar este comentário.");
      db.comments = db.comments.filter(x=>x.id!==id); save(); return ok(true);
    }
  },

  projects: {
    async list({ q, kind }={}){
      const viewer = me(); q = String(q||"").toLowerCase();
      return ok(db.projects
        .filter(p => (!kind || p.kind===kind) && (!q || (p.name+" "+p.description+" "+p.kind).toLowerCase().includes(q)))
        .sort((a,b)=>b.created_at.localeCompare(a.created_at))
        .map(p => ({ ...p,
          member_count: db.project_members.filter(m=>m.project_id===p.id).length,
          follower_count: db.follows.filter(f=>f.target_type==="project" && f.target_id===p.id).length,
          followed: !!viewer && isFollowing(viewer,"project",p.id),
          is_member: !!viewer && db.project_members.some(m=>m.project_id===p.id && m.user_id===viewer) })));
    },
    async get(id){
      const p = db.projects.find(x=>x.id===id); if(!p) return fail("Projeto não encontrado.");
      const viewer = me();
      return ok({ ...p,
        owner: publicUser(user(p.owner_id)),
        members: db.project_members.filter(m=>m.project_id===id).map(m=>({ ...publicUser(user(m.user_id)), member_role:m.role })),
        follower_count: db.follows.filter(f=>f.target_type==="project" && f.target_id===id).length,
        followed: !!viewer && isFollowing(viewer,"project",id),
        is_member: !!viewer && db.project_members.some(m=>m.project_id===id && m.user_id===viewer),
        is_owner: viewer===p.owner_id });
    },
    async create({ name, kind, description }){
      const viewer = need(); name = String(name||"").trim(); description = String(description||"").trim();
      if(name.length<3) return fail("Dê um nome ao projeto."); if(description.length<10) return fail("Descreva o projeto em pelo menos uma frase.");
      const p = { id: uid("p"), name: name.slice(0,100), kind: PROJECT_KINDS.includes(kind)?kind:"Outro", description: description.slice(0,1500), owner_id: viewer, created_at: iso(Date.now()) };
      db.projects.push(p); db.project_members.push({ project_id:p.id, user_id:viewer, role:"coordenação" });
      db.follows.push({ follower_id:viewer, target_type:"project", target_id:p.id }); save(); return ok(p);
    },
    async addMember(project_id, user_id, role="membro"){
      const viewer = need(); const p = db.projects.find(x=>x.id===project_id);
      if(!p || p.owner_id!==viewer) return fail("Só a coordenação do projeto pode adicionar membros.");
      if(!user(user_id)) return fail("Pessoa não encontrada.");
      if(db.project_members.some(m=>m.project_id===project_id && m.user_id===user_id)) return fail("Essa pessoa já participa do projeto.");
      db.project_members.push({ project_id, user_id, role: String(role).slice(0,30) || "membro" });
      notify(user_id, { type:"member_added", actor_id: viewer, project_id }); save(); return ok(true);
    },
    async leave(project_id){
      const viewer = need(); const p = db.projects.find(x=>x.id===project_id);
      if(p && p.owner_id===viewer) return fail("A coordenação não pode sair do próprio projeto.");
      db.project_members = db.project_members.filter(m=>!(m.project_id===project_id && m.user_id===viewer)); save(); return ok(true);
    }
  },

  follows: {
    async toggle(target_type, target_id){
      const viewer = need();
      if(target_type==="user" && target_id===viewer) return fail("Você não pode seguir a si mesmo.");
      const i = db.follows.findIndex(f=>f.follower_id===viewer && f.target_type===target_type && f.target_id===target_id);
      if(i>=0){ db.follows.splice(i,1); save(); return ok(false); }
      db.follows.push({ follower_id:viewer, target_type, target_id });
      if(target_type==="user") notify(target_id, { type:"follow", actor_id:viewer });
      else { const p = db.projects.find(x=>x.id===target_id); if(p) notify(p.owner_id, { type:"project_follow", actor_id:viewer, project_id:target_id }); }
      save(); return ok(true);
    }
  },

  notifications: {
    async list(){
      const viewer = need();
      return ok(db.notifications.filter(n=>n.user_id===viewer).sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,60)
        .map(n=>({ ...n, actor: publicUser(user(n.actor_id)), project: n.project_id ? { id:n.project_id, name: db.projects.find(p=>p.id===n.project_id)?.name } : null })));
    },
    async unreadCount(){ const viewer = me(); return ok(viewer ? db.notifications.filter(n=>n.user_id===viewer && !n.read).length : 0); },
    async markAllRead(){ const viewer = need(); db.notifications.forEach(n=>{ if(n.user_id===viewer) n.read = true; }); save(); return ok(true); }
  },

  moderation: {
    async report(post_id, reason){
      const viewer = need();
      if(!REPORT_REASONS.includes(reason)) return fail("Escolha um motivo.");
      if(db.reports.some(r=>r.post_id===post_id && r.reporter_id===viewer && r.status==="aberta")) return fail("Você já denunciou este post. A moderação vai analisar.");
      db.reports.push({ id: uid("r"), post_id, reporter_id: viewer, reason, created_at: iso(Date.now()), status:"aberta" }); save(); return ok(true);
    },
    async queue(){
      const viewer = need(); if(!user(viewer).is_mod) return fail("Acesso restrito à moderação.");
      return ok(db.reports.filter(r=>r.status==="aberta").sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(r=>{
        const p = db.posts.find(x=>x.id===r.post_id);
        return { ...r, reporter: publicUser(user(r.reporter_id)), post: p ? { ...p, author: publicUser(user(p.author_id)) } : null };
      }));
    },
    async resolve(report_id, action){
      const viewer = need(); if(!user(viewer).is_mod) return fail("Acesso restrito à moderação.");
      const r = db.reports.find(x=>x.id===report_id); if(!r) return fail("Denúncia não encontrada.");
      if(action==="hide"){
        const p = db.posts.find(x=>x.id===r.post_id); if(p){ p.hidden = true; notify(p.author_id, { type:"post_hidden", actor_id: viewer, post_id: p.id }); }
        db.reports.forEach(x=>{ if(x.post_id===r.post_id && x.status==="aberta") x.status = "oculto"; });
      } else r.status = "descartada";
      save(); return ok(true);
    }
  },

  /* Apaga os dados de demonstração e recomeça do zero (útil antes de apresentar) */
  async resetDemo(){ db = seed(); save(); localStorage.removeItem(SESSION_KEY); return ok(true); }
};
})();

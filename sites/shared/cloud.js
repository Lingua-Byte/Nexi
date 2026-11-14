/* Camada de nuvem compartilhada pelos apps (Supabase).
   Se sites/config.js estiver vazio, `Cloud.enabled` é false e os apps rodam em
   modo demonstração, sem rede. */
(() => {
  'use strict';
  const cfg = window.APP_CONFIG || {};
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase?.createClient);
  const sb = enabled ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
  }) : null;

  // Mensagens de erro do Supabase Auth em português.
  const AUTH_MSG = [
    [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/email not confirmed/i, 'Confirme seu e-mail antes de entrar. Procure o link na sua caixa de entrada.'],
    [/user already registered|already been registered/i, 'Já existe uma conta com este e-mail. Tente entrar.'],
    [/password should be at least/i, 'A senha precisa ter pelo menos 6 caracteres.'],
    [/rate limit|too many/i, 'Muitas tentativas. Aguarde um minuto e tente de novo.'],
    [/failed to fetch|network/i, 'Sem conexão com o servidor. Verifique sua internet.'],
    [/invalid email|unable to validate email/i, 'E-mail inválido.'],
  ];
  function authError(e) {
    const m = e?.message || String(e);
    const hit = AUTH_MSG.find(([re]) => re.test(m));
    return hit ? hit[1] : m;
  }

  const baseUrl = () => location.href.split('#')[0];

  async function unwrap(p) {
    const { data, error } = await p;
    if (error) throw error;
    return data;
  }

  const Cloud = {
    enabled,
    client: sb,
    authError,

    async session() {
      if (!sb) return null;
      const { data } = await sb.auth.getSession();
      return data.session || null;
    },
    onAuth(cb) { if (sb) sb.auth.onAuthStateChange((event, session) => cb(event, session)); },

    async signUp(email, password, meta, redirectHash = '#/app') {
      const data = await unwrap(sb.auth.signUp({ email, password, options: { data: meta || {}, emailRedirectTo: baseUrl() + redirectHash } }));
      return { session: data.session, user: data.user };
    },
    async signIn(email, password) {
      return (await unwrap(sb.auth.signInWithPassword({ email, password }))).session;
    },
    async signOut() { if (sb) await sb.auth.signOut(); },
    async resetPassword(email, redirectHash = '#/nova-senha') {
      await unwrap(sb.auth.resetPasswordForEmail(email, { redirectTo: baseUrl() + redirectHash }));
    },
    async updatePassword(password) { await unwrap(sb.auth.updateUser({ password })); },

    from(table) { return sb.from(table); },
    rpc(fn, args) { return unwrap(sb.rpc(fn, args)); },

    /** Chama uma Edge Function e devolve { data } ou lança Error com .code legível. */
    async invoke(name, body) {
      const { data, error } = await sb.functions.invoke(name, { body });
      if (error) {
        let code = error.message || 'erro';
        try { const j = await error.context?.json?.(); if (j?.error) code = j.error; } catch (_) { /* corpo não-JSON */ }
        const err = new Error(code); err.code = code; err.status = error.context?.status; throw err;
      }
      return data;
    },

    /** Documento JSON versionado por conta: { load, create, save }. */
    docStore({ table, saveFn, keyCol = 'owner_id' }) {
      return {
        async load(userId) {
          return unwrap(sb.from(table).select('*').eq(keyCol, userId).maybeSingle());
        },
        async create(row) {
          return unwrap(sb.from(table).insert(row).select('*').single());
        },
        /** Retorna a nova versão, ou -1 se outra sessão salvou antes. */
        async save(data, version) {
          return unwrap(sb.rpc(saveFn, { p_data: data, p_version: version }));
        },
      };
    },

    storage(bucket) { return sb.storage.from(bucket); },
  };

  // Salvamento com debounce, fila e tratamento de conflito/erro de rede.
  Cloud.autosaver = function ({ getData, getVersion, setVersion, save, onConflict, onError, onSaved, delay = 600 }) {
    let timer = null, inflight = null, pending = false, dirty = false, failed = false;
    function run() {
      timer = null;
      if (inflight) { pending = true; return inflight; }
      dirty = false; failed = false;
      inflight = (async () => {
        try {
          const v = await save(getData(), getVersion());
          if (v === -1 || v == null) await onConflict();
          else { setVersion(v); onSaved && onSaved(); }
        } catch (e) {
          dirty = true; failed = true; onError && onError(e);
          setTimeout(() => { if (dirty && !timer && !inflight) schedule(); }, 5000);
        } finally {
          inflight = null;
          if (pending) { pending = false; schedule(0); }
        }
      })();
      return inflight;
    }
    function schedule(ms = delay) { dirty = true; clearTimeout(timer); timer = setTimeout(run, ms); }
    /** Salva agora tudo o que estiver pendente. Retorna true se ficou tudo salvo. */
    async function flush() {
      for (let i = 0; i < 6; i++) {
        clearTimeout(timer); timer = null;
        if (inflight) { await inflight; continue; }
        if (!dirty) return true;
        await run();
        if (failed) return false;
      }
      return !dirty && !inflight;
    }
    window.addEventListener('beforeunload', e => { if (dirty || inflight) { e.preventDefault(); e.returnValue = ''; } });
    return { schedule, flush, isDirty: () => dirty || !!inflight };
  };

  window.Cloud = Cloud;
})();

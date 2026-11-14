// Busca licitações abertas no PNCP para os estados e modalidades pedidos.
// Exige usuário logado (verify_jwt = true no config.toml).
import { buscarAbertas, type Edital, MODALIDADES } from "../_shared/pncp.ts";
import { handle, HttpError, json, readJson } from "../_shared/http.ts";

const UFS = new Set("AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" "));
const cache = new Map<string, { at: number; data: Edital[] }>();
const TTL = 15 * 60 * 1000;

async function cached(uf: string, mod: number, paginas: number): Promise<Edital[]> {
  const key = `${uf}:${mod}:${paginas}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const data = await buscarAbertas(uf, mod, paginas);
  cache.set(key, { at: Date.now(), data });
  return data;
}

Deno.serve(handle(async (req) => {
  if (req.method !== "POST") throw new HttpError(405, "metodo_nao_permitido");
  const body = await readJson<{ ufs?: string[]; modalidades?: number[]; paginas?: number }>(req);
  const ufs = [...new Set((body.ufs ?? []).map((u) => String(u).toUpperCase()))].filter((u) => UFS.has(u)).slice(0, 27);
  const mods = [...new Set(body.modalidades ?? [6, 8, 4])].filter((m) => m in MODALIDADES).slice(0, 6);
  const paginas = Math.min(4, Math.max(1, Number(body.paginas) || 2));
  if (!ufs.length) throw new HttpError(400, "informe_ao_menos_um_estado");

  const tarefas = ufs.flatMap((uf) => mods.map((m) => [uf, m] as const));
  const editais = new Map<string, Edital>();
  const erros: string[] = [];
  // No máximo 6 requisições simultâneas ao PNCP.
  for (let i = 0; i < tarefas.length; i += 6) {
    const lote = await Promise.allSettled(tarefas.slice(i, i + 6).map(([uf, m]) => cached(uf, m, paginas)));
    lote.forEach((r, k) => {
      if (r.status === "fulfilled") r.value.forEach((e) => editais.set(e.id, e));
      else erros.push(`${tarefas[i + k][0]}/${MODALIDADES[tarefas[i + k][1]][0]}: ${r.reason?.message ?? r.reason}`);
    });
  }
  if (!editais.size && erros.length) throw new HttpError(502, "pncp_indisponivel");
  return json({ fonte: "PNCP", geradoEm: new Date().toISOString(), editais: [...editais.values()], erros });
}));

// Itens e arquivos de uma contratação do PNCP.
import { arquivos, itens, validarIds } from "../_shared/pncp.ts";
import { handle, HttpError, json, readJson } from "../_shared/http.ts";

Deno.serve(handle(async (req) => {
  if (req.method !== "POST") throw new HttpError(405, "metodo_nao_permitido");
  const body = await readJson<{ cnpj?: string; ano?: number; seq?: number }>(req);
  const ids = validarIds(body.cnpj, body.ano, body.seq);
  if (!ids) throw new HttpError(400, "identificador_invalido");

  const [its, arqs] = await Promise.allSettled([itens(ids.cnpj, ids.ano, ids.seq), arquivos(ids.cnpj, ids.ano, ids.seq)]);
  if (its.status === "rejected" && arqs.status === "rejected") throw new HttpError(502, "pncp_indisponivel");
  const lista = its.status === "fulfilled" ? its.value : [];
  return json({
    itens: lista,
    arquivos: arqs.status === "fulfilled" ? arqs.value : [],
    exclusivaME: lista.length > 0 && lista.every((i) => /exclusiva/i.test(i.beneficio)),
    criterio: lista.find((i) => i.criterio)?.criterio ?? "",
  });
}));

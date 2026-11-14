// Análise de edital e "Pergunte ao edital" com Claude.
// Secrets necessários: ANTHROPIC_API_KEY. Opcional: RADAR_LIMITE_MENSAL (padrão 100).
import Anthropic from "npm:@anthropic-ai/sdk@1.8.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { arquivos, editalPrincipal, validarIds } from "../_shared/pncp.ts";
import { handle, HttpError, json, readJson } from "../_shared/http.ts";

const MODEL = "claude-opus-5-5";
const LIMITE = Number(Deno.env.get("RADAR_LIMITE_MENSAL") ?? 100);

const DOC_KEYS = ["contrato", "cnd_federal", "fgts", "cndt", "estadual", "municipal", "balanco", "falencia", "atestado", "crea", "outro"];

const SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tldr", "recomendacao", "nivel", "pontos", "riscos", "exigencias", "flags", "prazos"],
  properties: {
    tldr: { type: "string", description: "Resumo em 2 ou 3 frases: quem compra, o quê, valor, critério de julgamento." },
    recomendacao: { type: "string", description: "Uma frase dizendo se vale participar para o perfil da empresa e por quê." },
    nivel: { type: "string", enum: ["alto", "medio", "baixo"], description: "Aderência ao perfil da empresa." },
    pontos: { type: "array", items: { type: "string" }, description: "Até 6 pontos principais, cada um citando o item do edital entre parênteses quando possível." },
    riscos: { type: "array", items: { type: "string" }, description: "Riscos e pendências concretos para esta empresa." },
    exigencias: {
      type: "array",
      description: "Documentos e condições de habilitação exigidos.",
      items: {
        type: "object", additionalProperties: false, required: ["texto", "categoria", "docKey"],
        properties: {
          texto: { type: "string" },
          categoria: { type: "string", enum: ["Jurídica", "Fiscal e trabalhista", "Econômico-financeira", "Técnica", "Proposta", "Outra"] },
          docKey: { type: "string", enum: DOC_KEYS, description: "Documento padrão equivalente, ou 'outro'." },
        },
      },
    },
    flags: {
      type: "object", additionalProperties: false, required: ["amostra", "garantia", "visitaTecnica", "exclusivaME"],
      properties: {
        amostra: { type: "boolean" }, visitaTecnica: { type: "boolean" }, exclusivaME: { type: "boolean" },
        garantia: { type: "string", description: "Percentual/forma da garantia contratual exigida, ou string vazia se não houver." },
      },
    },
    prazos: {
      type: "object", additionalProperties: false, required: ["esclarecimentos", "impugnacao", "entrega", "pagamento"],
      properties: {
        esclarecimentos: { type: "string", description: "Data limite AAAA-MM-DD ou string vazia." },
        impugnacao: { type: "string", description: "Data limite AAAA-MM-DD ou string vazia." },
        entrega: { type: "string" }, pagamento: { type: "string" },
      },
    },
  },
};

const SYSTEM = `Você é um analista de licitações públicas brasileiras (Lei 14.133/2021) que ajuda pequenas e médias empresas.
Responda sempre em português do Brasil, de forma objetiva.
Baseie-se apenas no edital, nos anexos e nos dados fornecidos. Quando a informação não estiver no material, diga claramente que não encontrou e sugira um pedido de esclarecimento ao agente de contratação.
Sempre que possível, cite de onde tirou a informação (ex.: "item 9.2 do edital", "Termo de Referência, item 5").
Você não dá parecer jurídico; lembre o usuário de conferir o documento original em decisões importantes.`;

interface EditalIn {
  id?: string; numero?: string; orgao?: string; uf?: string; cidade?: string; modalidade?: string; objeto?: string;
  valor?: number; abertura?: string; horaAbertura?: string; portal?: string; criterio?: string;
  cnpj?: string; ano?: number; seq?: number;
  itens?: { n: number; desc: string; qtd: number; unid: string; ref: number }[];
}
interface Body {
  action: "summary" | "chat";
  edital: EditalIn;
  pergunta?: string;
  historico?: { who: "user" | "ai"; txt: string }[];
  perfil?: { razao?: string; porte?: string; palavras?: string[]; ufs?: string[] };
  docs?: { nome: string; status: string }[];
}

function contexto(b: Body): string {
  const e = b.edital;
  const itens = (e.itens ?? []).slice(0, 200).map((i) => `- Item ${i.n}: ${i.desc} | ${i.qtd} ${i.unid} | ref. R$ ${i.ref}`).join("\n");
  return [
    `EDITAL ${e.numero ?? ""} | ${e.modalidade ?? ""} | ${e.orgao ?? ""} (${e.cidade ?? ""}/${e.uf ?? ""})`,
    `Objeto: ${e.objeto ?? ""}`,
    `Valor estimado: R$ ${e.valor ?? 0} | Sessão/fim das propostas: ${e.abertura ?? ""} ${e.horaAbertura ?? ""} | Portal: ${e.portal ?? ""}`,
    itens ? `Itens:\n${itens}` : "Itens: não informados.",
    `\nPERFIL DA EMPRESA: ${b.perfil?.razao ?? ""} | Porte: ${b.perfil?.porte ?? ""} | Ramo (palavras-chave): ${(b.perfil?.palavras ?? []).join(", ")} | Estados: ${(b.perfil?.ufs ?? []).join(", ")}`,
    `Documentos da empresa: ${(b.docs ?? []).map((d) => `${d.nome} (${d.status})`).join("; ") || "não informados"}`,
  ].join("\n");
}

async function pdfDoEdital(e: EditalIn): Promise<string | null> {
  const ids = validarIds(e.cnpj, e.ano, e.seq);
  if (!ids) return null;
  try {
    return editalPrincipal(await arquivos(ids.cnpj, ids.ano, ids.seq))?.url ?? null;
  } catch {
    return null;
  }
}

function textoDe(content: Anthropic.Beta.BetaContentBlock[]): string {
  return content.filter((b) => b.type === "text").map((b) => (b as Anthropic.Beta.BetaTextBlock).text).join("").trim();
}

async function chamar(client: Anthropic, b: Body, pdfUrl: string | null) {
  const intro: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (pdfUrl) intro.push({ type: "document", source: { type: "url", url: pdfUrl }, title: "Edital" });
  intro.push({ type: "text", text: contexto(b) });

  if (b.action === "summary") {
    intro.push({ type: "text", text: "Analise esta licitação para a empresa acima e preencha o JSON pedido." });
    return await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: { type: "json_schema", schema: SUMMARY_SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: intro }],
    });
  }

  // Chat: o material do edital vai na primeira mensagem (e é cacheado entre perguntas).
  const turnos = [...(b.historico ?? []).filter((m) => m?.txt && (m.who === "user" || m.who === "ai")).slice(-10),
    { who: "user" as const, txt: String(b.pergunta ?? "").slice(0, 2000) }];
  while (turnos.length && turnos[0].who !== "user") turnos.shift();
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const t of turnos) {
    const role = t.who === "user" ? "user" : "assistant";
    const last = messages[messages.length - 1];
    if (last && last.role === role) (last.content as Anthropic.Beta.BetaContentBlockParam[]).push({ type: "text", text: t.txt });
    else messages.push({ role, content: [{ type: "text", text: t.txt }] });
  }
  (messages[0].content as Anthropic.Beta.BetaContentBlockParam[]).unshift(...intro);
  return await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    cache_control: { type: "ephemeral" },
    output_config: { effort: "medium" },
    system: SYSTEM + "\nResponda em até 8 linhas, terminando com 'Fonte: ...' quando houver.",
    messages,
  });
}

Deno.serve(handle(async (req) => {
  if (req.method !== "POST") throw new HttpError(405, "metodo_nao_permitido");
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new HttpError(503, "ia_nao_configurada");

  const url = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) throw new HttpError(401, "nao_autenticado");

  const b = await readJson<Body>(req);
  if (!b?.edital || !["summary", "chat"].includes(b.action)) throw new HttpError(400, "requisicao_invalida");
  if (b.action === "chat" && !String(b.pergunta ?? "").trim()) throw new HttpError(400, "pergunta_vazia");

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: usado, error: usoErr } = await admin.rpc("radar_consumir_analise", { p_owner: user.id, p_limite: LIMITE });
  if (usoErr) throw usoErr;
  if (usado === -1) throw new HttpError(429, "limite_mensal_atingido");

  const client = new Anthropic({ apiKey });
  try {
    const pdfUrl = await pdfDoEdital(b.edital);
    let res;
    try {
      res = await chamar(client, b, pdfUrl);
    } catch (e) {
      // Se o PDF não puder ser lido (formato, tamanho, link), tenta só com os dados estruturados.
      if (pdfUrl && e instanceof Anthropic.BadRequestError) res = await chamar(client, b, null);
      else throw e;
    }
    if (res.stop_reason === "refusal") throw new HttpError(422, "ia_recusou");
    const texto = textoDe(res.content);
    if (b.action === "summary") {
      let resumo;
      try { resumo = JSON.parse(texto); } catch { throw new HttpError(502, "resposta_ia_invalida"); }
      return json({ resumo, usado, limite: LIMITE, leuPdf: !!pdfUrl });
    }
    return json({ resposta: texto, usado, limite: LIMITE });
  } catch (e) {
    await admin.rpc("radar_devolver_analise", { p_owner: user.id });
    if (e instanceof HttpError) throw e;
    if (e instanceof Anthropic.RateLimitError) throw new HttpError(429, "ia_ocupada_tente_novamente");
    if (e instanceof Anthropic.AuthenticationError) throw new HttpError(503, "chave_da_ia_invalida");
    if (e instanceof Anthropic.APIError) { console.error("Anthropic", e.status, e.message); throw new HttpError(502, "ia_indisponivel"); }
    throw e;
  }
}));

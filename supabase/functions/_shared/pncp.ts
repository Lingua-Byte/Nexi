// Cliente da API pública do PNCP (Portal Nacional de Contratações Públicas).
// Documentação: https://pncp.gov.br/api/consulta/swagger-ui/index.html

const CONSULTA = "https://pncp.gov.br/api/consulta/v1";
const PNCP = "https://pncp.gov.br/api/pncp/v1";

export const MODALIDADES: Record<number, [string, string]> = {
  4: ["Concorrência", "CC"],
  5: ["Concorrência", "CC"],
  6: ["Pregão Eletrônico", "PE"],
  7: ["Pregão Presencial", "PP"],
  8: ["Dispensa Eletrônica", "DE"],
  12: ["Credenciamento", "CR"],
};

const CATEGORIAS: [string, RegExp][] = [
  ["Tecnologia", /inform[aá]tic|computador|notebook|desktop|software|licen[cç]a de uso|impressora|toner|servidor(es)? de rede|rede l[oó]gica|wi-?fi|tablet|tecnologia da informa|\bti\b|datacenter|data center|nobreak|switch/i],
  ["Obras", /obra|reforma|constru[cç][aã]o|pavimenta|engenharia|edifica[cç]|drenagem|recapeamento/i],
  ["Saúde", /medicament|hospitalar|sa[uú]de|odontol|laborat|insumos m[eé]dic|enfermagem|vacina/i],
  ["Alimentação", /aliment|merenda|g[eê]neros aliment|caf[eé]|refei[cç]|hortifr|carne|leite/i],
  ["Limpeza", /limpeza|conserva[cç][aã]o predial|higiene|saneant|copa e cozinha/i],
  ["Escritório", /expediente|papelaria|mobili[aá]rio|cadeira|mesa de escrit|papel a4/i],
  ["Veículos", /ve[ií]culo|combust[ií]vel|pneu|manuten[cç][aã]o de frota|autom[oó]v/i],
];

export function categoria(texto: string): string {
  for (const [nome, re] of CATEGORIAS) if (re.test(texto)) return nome;
  return "Outros";
}

function portal(link?: string | null): string {
  if (!link) return "PNCP";
  try {
    const host = new URL(link).hostname.replace(/^www\./, "");
    if (host.includes("comprasnet") || host.includes("compras.gov") || host.includes("serpro")) return "Compras.gov.br";
    if (host.includes("bll")) return "BLL Compras";
    if (host.includes("licitacoes-e") || host.includes("bb.com")) return "Licitações-e (BB)";
    if (host.includes("portaldecompraspublicas")) return "Portal de Compras Públicas";
    if (host.includes("bnc")) return "BNC";
    return host;
  } catch {
    return "PNCP";
  }
}

// deno-lint-ignore no-explicit-any
type Raw = Record<string, any>;

export interface Edital {
  id: string; numero: string; orgao: string; unidade: string; uf: string; cidade: string;
  modalidade: string; categoria: string; objeto: string; valor: number;
  abertura: string; horaAbertura: string; publicado: string; portal: string;
  link: string; linkOrigem: string | null; cnpj: string; ano: number; seq: number;
  srp: boolean; situacao: string; fonte: "pncp";
}

export function normalizar(c: Raw): Edital | null {
  const cnpj = c?.orgaoEntidade?.cnpj;
  const ano = c?.anoCompra;
  const seq = c?.sequencialCompra;
  if (!cnpj || !ano || !seq) return null;
  const [mod, abbr] = MODALIDADES[c.modalidadeId] ?? [c.modalidadeNome ?? "Licitação", "LC"];
  const fim: string = c.dataEncerramentoProposta || c.dataAberturaProposta || "";
  const [data, hora] = fim.split("T");
  const objeto = String(c.objetoCompra ?? "").replace(/\s+/g, " ").trim();
  return {
    id: c.numeroControlePNCP || `${cnpj}-${ano}-${seq}`,
    numero: `${abbr} ${c.numeroCompra || seq}/${ano}`,
    orgao: c.orgaoEntidade?.razaoSocial ?? "Órgão não informado",
    unidade: c.unidadeOrgao?.nomeUnidade ?? "",
    uf: c.unidadeOrgao?.ufSigla ?? "",
    cidade: c.unidadeOrgao?.municipioNome ?? "",
    modalidade: mod,
    categoria: categoria(objeto),
    objeto,
    valor: Number(c.valorTotalEstimado) || 0,
    abertura: data || "",
    horaAbertura: (hora || "").slice(0, 5),
    publicado: String(c.dataPublicacaoPncp ?? "").slice(0, 10),
    portal: portal(c.linkSistemaOrigem),
    link: `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${seq}`,
    linkOrigem: c.linkSistemaOrigem ?? null,
    cnpj, ano, seq,
    srp: !!c.srp,
    situacao: c.situacaoCompraNome ?? "",
    fonte: "pncp",
  };
}

async function getJson(url: string): Promise<Raw | null> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20000) });
  if (res.status === 204) return null; // PNCP responde 204 quando não há resultados
  if (!res.ok) throw new Error(`PNCP ${res.status} em ${url}`);
  return await res.json();
}

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/** Licitações com prazo de proposta em aberto, por UF e modalidade. */
export async function buscarAbertas(uf: string, modalidade: number, paginas = 2): Promise<Edital[]> {
  const fim = new Date(Date.now() + 90 * 86400000);
  const out: Edital[] = [];
  for (let pagina = 1; pagina <= paginas; pagina++) {
    const url = `${CONSULTA}/contratacoes/proposta?dataFinal=${ymd(fim)}&codigoModalidadeContratacao=${modalidade}` +
      `&uf=${uf}&pagina=${pagina}&tamanhoPagina=50`;
    const body = await getJson(url);
    const lista: Raw[] = body?.data ?? [];
    for (const c of lista) {
      const e = normalizar(c);
      if (e) out.push(e);
    }
    if (!body || body.paginasRestantes === 0 || lista.length < 50) break;
  }
  return out;
}

export interface Item { n: number; desc: string; qtd: number; unid: string; ref: number; beneficio: string; criterio: string }
export interface Arquivo { titulo: string; tipo: string; url: string }

export async function itens(cnpj: string, ano: number, seq: number): Promise<Item[]> {
  const out: Item[] = [];
  for (let pagina = 1; pagina <= 5; pagina++) {
    const body = await getJson(`${PNCP}/orgaos/${cnpj}/compras/${ano}/${seq}/itens?pagina=${pagina}&tamanhoPagina=100`);
    const lista: Raw[] = Array.isArray(body) ? body : body?.data ?? [];
    for (const i of lista) {
      out.push({
        n: Number(i.numeroItem) || out.length + 1,
        desc: String(i.descricao ?? "").replace(/\s+/g, " ").trim(),
        qtd: Number(i.quantidade) || 0,
        unid: i.unidadeMedida ?? "un",
        ref: Number(i.valorUnitarioEstimado) || 0,
        beneficio: i.tipoBeneficioNome ?? "",
        criterio: i.criterioJulgamentoNome ?? "",
      });
    }
    if (lista.length < 100) break;
  }
  return out;
}

export async function arquivos(cnpj: string, ano: number, seq: number): Promise<Arquivo[]> {
  const body = await getJson(`${PNCP}/orgaos/${cnpj}/compras/${ano}/${seq}/arquivos`);
  const lista: Raw[] = Array.isArray(body) ? body : body?.data ?? [];
  return lista
    .filter((a) => a.url || a.uri)
    .map((a) => ({ titulo: a.titulo ?? "Documento", tipo: a.tipoDocumentoNome ?? a.tipoDocumentoDescricao ?? "", url: a.url ?? a.uri }));
}

/** Escolhe o arquivo mais provável de ser o edital principal. */
export function editalPrincipal(lista: Arquivo[]): Arquivo | undefined {
  return lista.find((a) => /edital/i.test(a.tipo)) ?? lista.find((a) => /edital/i.test(a.titulo)) ?? lista[0];
}

export function validarIds(cnpj: unknown, ano: unknown, seq: unknown): { cnpj: string; ano: number; seq: number } | null {
  const c = String(cnpj ?? "").replace(/\D/g, "");
  const a = Number(ano), s = Number(seq);
  if (c.length !== 14 || !Number.isInteger(a) || a < 2000 || a > 2100 || !Number.isInteger(s) || s < 1) return null;
  return { cnpj: c, ano: a, seq: s };
}

"""Troca as trilhas sintetizadas por GRAVAÇÕES REAIS em domínio público ou CC0, do Wikimedia Commons.

Rode no seu PC (o servidor de nuvem tem as consultas limitadas pelo Wikimedia):
    python baixar_trilhas.py            → tenta todas as trilhas
    python baixar_trilhas.py T01 T08    → só algumas
Depois:  node remixar.js 1 2 3 4 5 6 7  (aplica nos vídeos já prontos)  e  node empacotar.js <dia>

Regras de segurança:
- Só aceita arquivos com licença DOMÍNIO PÚBLICO ou CC0 (lida da própria página do arquivo no Commons).
- Recusa CC BY, CC BY-SA e qualquer outra licença. Se não achar nada aceitável, mantém a trilha sintetizada.
- Grava o intérprete, a licença e o link de cada arquivo em trilhas-creditos.json (e nos créditos dos posts).
Atenção: o Commons avalia o domínio público pela lei dos EUA. Para gravações (não composições), confira a
página do arquivo: as mais seguras são as marcadas "CC0" ou "Public domain" pelo próprio intérprete
(ex.: Musopen, bandas militares dos EUA).
Requer: Python 3 e ffmpeg no PATH.
"""
import json, os, re, subprocess, sys, time, urllib.parse, urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "GlossaEstudio/1.0 (ferramenta educativa; uso pessoal)"}
ACEITAS = re.compile(r"(public domain|^pd\b|pd-|cc0|domínio público|dominio publico)", re.I)

# O que procurar para cada trilha (mesmo clima da trilha sintetizada). A primeira busca com resultado aceitável vence.
BUSCAS = {
    "T01": ["Bach chorale organ", "Bach Jesu joy of man's desiring"],
    "T02": ["Bach Air on the G string", "Bach orchestral suite 3 air"],
    "T03": ["Bach prelude C major BWV 846", "Bach well-tempered clavier prelude"],
    "T04": ["Bach Goldberg variations aria", "Bach cello suite 1 prelude"],
    "T08": ["Mozart sonata K. 545", "Mozart piano sonata"],
    "T09": ["Haydn string quartet", "Haydn andante"],
    "T10": ["Satie Gymnopedie", "Satie Gnossienne"],
    "T11": ["Monteverdi", "Palestrina"],
    "T12": ["Josquin", "renaissance lute"],
    "T13": ["Schubert impromptu", "Schubert serenade"],
    "T14": ["Handel sarabande", "Handel largo"],
    "T15": ["Schumann Traumerei", "Schumann Kinderszenen"],
    "T16": ["Corelli", "Vivaldi largo"],
    "T17": ["Beethoven moonlight sonata", "Beethoven adagio"],
}


def api(params):
    params = dict(params, format="json")
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    for tentativa in range(5):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(5 * (tentativa + 1)); continue
            raise
    raise RuntimeError("Commons recusou as consultas (429). Tente mais tarde.")


def candidatos(busca):
    r = api({"action": "query", "generator": "search", "gsrsearch": f"filetype:audio {busca}", "gsrnamespace": 6, "gsrlimit": 15,
             "prop": "imageinfo", "iiprop": "url|size|extmetadata", "iiextmetadatafilter": "LicenseShortName|Artist|UsageTerms"})
    pags = sorted(r.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0))
    for p in pags:
        ii = p["imageinfo"][0]; md = ii.get("extmetadata", {})
        lic = re.sub("<[^>]+>", "", md.get("LicenseShortName", {}).get("value", ""))
        artista = re.sub("<[^>]+>", "", md.get("Artist", {}).get("value", "")).strip()[:120]
        if ACEITAS.search(lic) and 200_000 < ii.get("size", 0) < 60_000_000:
            yield {"titulo": p["title"], "url": ii["url"], "pagina": ii.get("descriptionurl", ""), "licenca": lic, "artista": artista}


def baixar(tid, c):
    tmp = os.path.join(AQUI, "trilhas", f"{tid}.download")
    with urllib.request.urlopen(urllib.request.Request(c["url"], headers=UA), timeout=120) as r, open(tmp, "wb") as f:
        f.write(r.read())
    wav = os.path.join(AQUI, "trilhas", f"{tid}.wav")
    # normaliza: estéreo 44,1 kHz, até 90 s, volume padrão
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-t", "90", "-ac", "2", "-ar", "44100",
                    "-af", "loudnorm=I=-14:TP=-1.5", wav], check=True)
    os.remove(tmp)


def main(so):
    cred_path = os.path.join(AQUI, "trilhas-creditos.json")
    cred = json.load(open(cred_path, encoding="utf-8"))
    for tid, buscas in BUSCAS.items():
        if so and tid not in so:
            continue
        achou = None
        for b in buscas:
            for c in candidatos(b):
                achou = c; break
            if achou:
                break
            time.sleep(1)
        if not achou:
            print(f"{tid}: nada em domínio público/CC0, mantém a trilha sintetizada"); continue
        baixar(tid, achou)
        nome = achou["titulo"].replace("File:", "").rsplit(".", 1)[0]
        cred[tid] = f"{nome} · gravação: {achou['artista'] or 'ver página'} · {achou['licenca']} · {achou['pagina']}"
        print(f"{tid}: ✓ {nome} [{achou['licenca']}]")
        time.sleep(1)
    json.dump(cred, open(cred_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("Pronto. Ouça as trilhas em trilhas/ e depois rode: node remixar.js 1 2 3 4 5 6 7")


if __name__ == "__main__":
    main(sys.argv[1:])

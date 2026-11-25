#!/usr/bin/env python3
"""Baixa os modelos de tradução do RAIZ (Mozilla / Firefox Translations, MPL-2.0)
e escreve linguas/models/registry.json.

Os modelos rodam DENTRO do celular (motor Bergamot em WebAssembly): nenhuma API,
nenhuma chave, nada sai do aparelho. Ficam no site publicado, não no repositório.

Uso: python3 tools/fetch_models.py <pasta-de-saída> [par ...]
     sem pares = todos os do RAIZ (português ↔ inglês e inglês ↔ cada língua).
"""
import hashlib
import json
import os
import sys
import urllib.request

REGISTRY = 'https://storage.googleapis.com/moz-fx-translations-data--303e-prod-translations-data/db/models.json'
LANGS = ['es', 'fr', 'de', 'it', 'ja', 'ko', 'he']
ALL_PAIRS = ['pt-en', 'en-pt'] + [p for x in LANGS for p in (f'en-{x}', f'{x}-en')]
PARTS = {'model': 'model', 'lexicalShortlist': 'lex', 'vocab': 'vocab', 'srcVocab': 'srcvocab', 'trgVocab': 'trgvocab'}


def get(url):
    with urllib.request.urlopen(url, timeout=300) as r:
        return r.read()


def pick(versions):
    """Prefere o modelo publicado no Firefox; senão, o mais recente."""
    released = [v for v in versions if v.get('releaseStatus') and 'Release' in v['releaseStatus']]
    return (released or versions)[-1]


def main():
    out = sys.argv[1]
    pairs = sys.argv[2:] or ALL_PAIRS
    data = json.loads(get(REGISTRY))
    base, models = data['baseUrl'], data['models']
    reg_path = os.path.join(out, 'registry.json')
    registry = json.load(open(reg_path)) if os.path.exists(reg_path) else {}
    for pair in pairs:
        v = pick(models[pair])
        src, trg = pair.split('-')
        entry = {'architecture': v['architecture']}
        os.makedirs(os.path.join(out, pair), exist_ok=True)
        for part, info in v['files'].items():
            key = PARTS.get(part)
            if not key:
                continue
            name = os.path.basename(info['path'])
            dest = os.path.join(out, pair, name)
            if not os.path.exists(dest):
                blob = get(f"{base}/{info['path']}")
                with open(dest, 'wb') as f:
                    f.write(blob)
            size = os.path.getsize(dest)
            entry[key] = {'name': f'{pair}/{name}', 'size': size,
                          'sha256': hashlib.sha256(open(dest, 'rb').read()).hexdigest()}
        registry[src + trg] = entry
        print(f'{pair}: {v["architecture"]}, {sum(e["size"] for k, e in entry.items() if isinstance(e, dict)) // 1_000_000} MB')
    with open(reg_path, 'w') as f:
        json.dump(registry, f, indent=1)


if __name__ == '__main__':
    main()

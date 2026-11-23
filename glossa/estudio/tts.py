"""Gera a narração (MP3) e o tempo de cada palavra (JSON) com a voz neural grátis do Edge.

Uso: python tts.py <roteiro.txt> <saida_sem_extensao> [voz] [velocidade]
Ex.: python tts.py videos/A1/narracao.txt videos/A1/narracao pt-BR-AntonioNeural +6%
Requer: pip install edge-tts
"""
import asyncio, json, os, sys
import edge_tts


async def main(txt_path, out, voice="pt-BR-AntonioNeural", rate="+6%"):
    text = open(txt_path, encoding="utf-8").read().strip()
    kw = {}
    if os.environ.get("HTTPS_PROXY"):
        kw["proxy"] = os.environ["HTTPS_PROXY"]
    com = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary", **kw)
    words = []
    with open(out + ".mp3", "wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                s = chunk["offset"] / 1e7
                words.append({"w": chunk["text"], "s": round(s, 3), "e": round(s + chunk["duration"] / 1e7, 3)})
    json.dump(words, open(out + ".json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"{len(words)} palavras · {words[-1]['e']:.1f} s")


if __name__ == "__main__":
    asyncio.run(main(*sys.argv[1:]))

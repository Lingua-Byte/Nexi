"""Narração com pausas naturais (voz neural grátis do Edge).

Uso: python tts.py <narracao.json> <saida_sem_extensao> [voz] [velocidade]
narracao.json = lista de trechos: textos e números (pausa em segundos depois do trecho anterior).
Ex.: ["Toda vez que você fala algoritmo,", "está falando o nome de um homem.", 0.6, "No século nove..."]
Entre dois textos sem número, a pausa padrão é 0,28 s.
Um trecho pode ser {"t": "texto", "voz": "tr-TR-AhmetNeural"} para ler uma palavra estrangeira com outra voz.
Gera <saida>.m4a (áudio) e <saida>.json (palavras com início/fim em segundos).
Requer: pip install edge-tts  e  ffmpeg no PATH.
"""
import asyncio, json, os, subprocess, sys, tempfile, wave

PAUSA_PADRAO = 0.28
SR = 24000


async def sintetizar(texto, voz, vel, mp3):
    import edge_tts
    kw = {"proxy": os.environ["HTTPS_PROXY"]} if os.environ.get("HTTPS_PROXY") else {}
    palavras = []
    for tentativa in range(4):
        try:
            com = edge_tts.Communicate(texto, voz, rate=vel, boundary="WordBoundary", **kw)
            palavras = []
            with open(mp3, "wb") as f:
                async for ch in com.stream():
                    if ch["type"] == "audio":
                        f.write(ch["data"])
                    elif ch["type"] == "WordBoundary":
                        s = ch["offset"] / 1e7
                        palavras.append({"w": ch["text"], "s": s, "e": s + ch["duration"] / 1e7})
            return palavras
        except Exception as e:  # rede instável: tenta de novo
            if tentativa == 3:
                raise
            await asyncio.sleep(2 * (tentativa + 1))


def para_wav(mp3, wav):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", str(SR), "-sample_fmt", "s16", wav], check=True)


async def main(entrada, saida, voz="pt-BR-AntonioNeural", vel="+2%"):
    trechos = json.load(open(entrada, encoding="utf-8"))
    tmp = tempfile.mkdtemp()
    quadros = bytearray()
    todas = []
    t = 0.12
    quadros += b"\x00\x00" * int(SR * t)
    pausa = None
    n = 0
    for tr in trechos:
        if isinstance(tr, (int, float)):
            pausa = float(tr)
            continue
        if n > 0:
            p = PAUSA_PADRAO if pausa is None else pausa
            quadros += b"\x00\x00" * int(SR * p)
            t += p
        pausa = None
        mp3, wav = os.path.join(tmp, f"{n}.mp3"), os.path.join(tmp, f"{n}.wav")
        texto, v = (tr["t"], tr.get("voz", voz)) if isinstance(tr, dict) else (tr, voz)
        pal = await sintetizar(texto, v, vel, mp3)
        para_wav(mp3, wav)
        with wave.open(wav) as w:
            dados = w.readframes(w.getnframes())
        # corta silêncio do fim do trecho (o Edge deixa ~0,4 s), mantendo 60 ms
        amostras = memoryview(dados).cast("h")
        fim = len(amostras)
        while fim > 0 and abs(amostras[fim - 1]) < 300:
            fim -= 1
        fim = min(len(amostras), fim + int(SR * 0.06))
        dados = dados[: fim * 2]
        for p in pal:
            todas.append({"w": p["w"], "s": round(t + p["s"], 3), "e": round(t + p["e"], 3)})
        quadros += dados
        t += len(dados) / 2 / SR
        n += 1
    quadros += b"\x00\x00" * int(SR * 0.3)
    wav_final = os.path.join(tmp, "final.wav")
    with wave.open(wav_final, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(quadros))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav_final, "-af", "loudnorm=I=-15:TP=-1.5:LRA=7",
                    "-ar", "48000", "-c:a", "aac", "-b:a", "160k", saida + ".m4a"], check=True)
    json.dump(todas, open(saida + ".json", "w", encoding="utf-8"), ensure_ascii=False)
    print(f"{len(todas)} palavras · {t:.1f} s")


if __name__ == "__main__":
    asyncio.run(main(*sys.argv[1:]))

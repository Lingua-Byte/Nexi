#!/usr/bin/env python3
"""Gera ../sfx.html (arquivo único, app completo / PWA).
Com --artifact DIR, gera também DIR/sfx-artifact.html (versão de demonstração para artefato do claude.ai)."""
import re, sys
from pathlib import Path
d = Path(__file__).parent
FILES = ["engine.js", "master.js", "presets.js", "ui.js", "app.js", "shared.js", "mixer.js", "voice.js", "video.js", "music.js", "instrument.js", "boot.js"]
js = "\n".join((d / f).read_text() for f in FILES)
assert "</script" not in js
html = (d / "shell.html").read_text().replace("<!--SCRIPTS-->", "<script>\n" + js + "\n</script>")
(d.parent / "sfx.html").write_text(html)
print("sfx.html:", len(html) // 1024, "KB")
if "--artifact" in sys.argv:
    out = Path(sys.argv[sys.argv.index("--artifact") + 1])
    a = re.sub(r"<!doctype html>\s*<html[^>]*>\s*<head>\s*", "", html, flags=re.I)
    a = re.sub(r'<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*<meta name="theme-color"[^>]*>\s*', "", a)
    a = re.sub(r'<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\s*', "", a)
    a = a.replace("</head>\n<body>\n", "").replace("</body>\n</html>", "")
    banner = ('<div class="demo">Versão de demonstração dentro do Claude: aqui você ouve, edita e toca os sons. '
              'Os downloads saem em .zip. Microfone, MIDI e as integrações de IA funcionam só no app instalado (PWA).</div>')
    a = a.replace('<div class="app">', '<div class="app">\n' + banner, 1)
    out.mkdir(parents=True, exist_ok=True); (out / "sfx-artifact.html").write_text(a)
    print("sfx-artifact.html:", len(a) // 1024, "KB")

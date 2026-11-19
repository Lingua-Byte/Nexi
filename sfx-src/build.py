#!/usr/bin/env python3
"""Gera ../sfx.html (arquivo único) a partir dos fontes desta pasta."""
from pathlib import Path
d = Path(__file__).parent
js = "\n".join((d / f).read_text() for f in ["engine.js", "master.js", "presets.js", "ui.js", "app.js"])
assert "</script" not in js
html = (d / "shell.html").read_text().replace("<!--SCRIPTS-->", "<script>\n" + js + "\n</script>")
(d.parent / "sfx.html").write_text(html)
print("sfx.html:", len(html) // 1024, "KB")

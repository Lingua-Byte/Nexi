"""Gera o ícone do Narrador (microfone sobre gradiente âmbar) em todas as densidades."""
from PIL import Image, ImageDraw
import os, sys
here = os.path.dirname(os.path.abspath(__file__))
S = 1024
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
# gradiente diagonal
grad = Image.new("RGBA", (S, S))
gp = grad.load()
a, b = (240, 179, 90), (233, 120, 82)
for y in range(S):
    for x in range(S):
        t = (x + y) / (2 * S)
        gp[x, y] = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([40, 40, S - 40, S - 40], radius=230, fill=255)
img.paste(grad, (0, 0), mask)
d = ImageDraw.Draw(img)
ink = (27, 20, 32, 255)
cx = S // 2
d.rounded_rectangle([cx - 120, 230, cx + 120, 600], radius=120, fill=ink)          # cápsula
d.arc([cx - 210, 330, cx + 210, 720], start=0, end=180, fill=ink, width=48)        # suporte
d.rectangle([cx - 24, 715, cx + 24, 810], fill=ink)                                # haste
d.rounded_rectangle([cx - 140, 795, cx + 140, 843], radius=24, fill=ink)           # base
for k, (x0, x1) in enumerate([(cx + 255, cx + 285), (cx + 320, cx + 350)]):      # ondas
    h = 90 + k * 70
    d.rounded_rectangle([x0, 465 - h, x1, 465 + h], radius=15, fill=(27, 20, 32, 170))
    d.rounded_rectangle([2 * cx - x1, 465 - h, 2 * cx - x0, 465 + h], radius=15, fill=(27, 20, 32, 170))
sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
for dpi, px in sizes.items():
    out = os.path.join(here, "res", f"mipmap-{dpi}", "ic_launcher.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    img.resize((px, px), Image.LANCZOS).save(out)
img.resize((512, 512), Image.LANCZOS).save(os.path.join(here, "icon-512.png"))
print("ícones gerados")

#!/usr/bin/env python3
"""Play Store graphics from the app icon: icon 512×512 and feature graphic 1024×500."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'store' / 'play'
FONTS = ROOT / 'node_modules' / '@expo-google-fonts'
OUT.mkdir(parents=True, exist_ok=True)

icon = Image.open(ROOT / 'assets' / 'icon.png').convert('RGB')
icon.resize((512, 512), Image.LANCZOS).save(OUT / 'icon-512.png')

W, H = 1024, 500
img = Image.new('RGB', (W, H), '#F5EFE3')
draw = ImageDraw.Draw(img)
# Faint notebook rules and margin line, like the editor.
for y in range(60, H, 44):
    draw.line([(0, y), (W, y)], fill='#E3E8EE', width=2)
draw.line([(70, 0), (70, H)], fill='#E8B4A8', width=3)
logo = icon.resize((300, 300), Image.LANCZOS)
img.paste(logo, (110, (H - 300) // 2))
title = ImageFont.truetype(str(FONTS / 'caveat/700Bold/Caveat_700Bold.ttf'), 104)
sub = ImageFont.truetype(str(FONTS / 'inter/400Regular/Inter_400Regular.ttf'), 30)
draw.text((450, 150), 'Tagebuch', font=title, fill='#8C5A3C')
draw.text((452, 270), 'Privat schreiben – mit Fotos,', font=sub, fill='#2E2A24')
draw.text((452, 310), 'Impulsen und Stimmung.', font=sub, fill='#2E2A24')
img.save(OUT / 'feature-1024x500.png')
print('store/play/icon-512.png, store/play/feature-1024x500.png')

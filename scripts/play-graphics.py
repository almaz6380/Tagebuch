#!/usr/bin/env python3
"""Play Store icon 512×512 from the app icon. Feature graphics: scripts/store-screenshots.mjs."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'store' / 'play'
FONTS = ROOT / 'node_modules' / '@expo-google-fonts'
OUT.mkdir(parents=True, exist_ok=True)

icon = Image.open(ROOT / 'assets' / 'icon.png').convert('RGB')
icon.resize((512, 512), Image.LANCZOS).save(OUT / 'icon-512.png')

print('store/play/icon-512.png (the feature graphics come from scripts/store-screenshots.mjs)')

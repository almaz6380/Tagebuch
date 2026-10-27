"""Store texts per language from store/locales/<lang>.json, plus the shared store/texte.json.

Both store scripts read through here so a new language is one more JSON file.
"""
import json
from pathlib import Path

STORE = Path(__file__).resolve().parent.parent / 'store'


def load():
    t = json.loads((STORE / 'texte.json').read_text())
    files = sorted((STORE / 'locales').glob('*.json'))
    langs = [json.loads(f.read_text()) for f in files]
    # Primary language first: Apple and Play both expect it to exist before the others.
    langs.sort(key=lambda l: l['appleLocale'] != t['primaryLocale'])
    t['langs'] = langs
    return t


def legal_urls(lang: dict) -> dict:
    """German has its own legal pages; everyone else gets the English ones."""
    base = 'https://tagebuch-c5j.pages.dev'
    if lang['lang'] == 'de':
        return {'privacy': f'{base}/datenschutz', 'support': f'{base}/support', 'marketing': base}
    return {'privacy': f'{base}/privacy', 'support': f'{base}/help', 'marketing': base}

#!/usr/bin/env python3
"""Google Play for the Tagebuch app: store listing, graphics, upload and release.

Needs PLAY_SERVICE_ACCOUNT_JSON (the service account key, JSON) in the environment.
Everything happens in one Play "edit"; without --ausfuehren it is validated but never committed.

  python3 scripts/play.py status
  python3 scripts/play.py eintrag --ausfuehren                     # texts, icon, feature graphic, screenshots (all locales)
  python3 scripts/play.py produkt --ausfuehren                     # one-time product "Remove ads"
  python3 scripts/play.py release --aab app.aab --ausfuehren        # upload + release to production
"""
import argparse
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import store_locales

ROOT = Path(__file__).resolve().parent.parent
STORE = ROOT / 'store'
PACKAGE = 'io.github.almaz6380.tagebuch'
API = f'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PACKAGE}'
UPLOAD = f'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/{PACKAGE}'


def access_token() -> str:
    import jwt  # pyjwt

    key = json.loads(os.environ['PLAY_SERVICE_ACCOUNT_JSON'])
    now = int(time.time())
    assertion = jwt.encode(
        {'iss': key['client_email'], 'scope': 'https://www.googleapis.com/auth/androidpublisher',
         'aud': 'https://oauth2.googleapis.com/token', 'iat': now, 'exp': now + 3600},
        key['private_key'], algorithm='RS256',
    )
    body = f'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion={assertion}'.encode()
    req = urllib.request.Request('https://oauth2.googleapis.com/token', data=body, method='POST')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    return json.load(urllib.request.urlopen(req))['access_token']


TOKEN = None


def call(method, url, body=None, raw=None, content_type=None, fatal=True):
    global TOKEN
    TOKEN = TOKEN or access_token()
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Authorization', f'Bearer {TOKEN}')
    if data is not None:
        req.add_header('Content-Type', content_type or 'application/json')
    try:
        with urllib.request.urlopen(req, timeout=600) as res:
            text = res.read().decode()
            return json.loads(text) if text else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode()
        if not fatal:
            return {'_error': e.code, '_detail': detail}
        if e.code == 404:
            sys.exit(f'Play kennt {PACKAGE} nicht. Bitte die App zuerst in der Play Console anlegen.\n{detail[:400]}')
        if e.code == 403:
            sys.exit('403 – das Dienstkonto hat für diese App keine Rechte. Play Console → Nutzer und '
                     f'Berechtigungen → Dienstkonto mit Admin-Rechten für die App einladen.\n{detail[:600]}')
        sys.exit(f'{method} {url} -> {e.code}\n{detail[:1500]}')


def new_edit():
    return call('POST', f'{API}/edits', {})['id']


def finish(edit, ausfuehren):
    call('POST', f'{API}/edits/{edit}:validate')
    if not ausfuehren:
        call('DELETE', f'{API}/edits/{edit}')
        print('Probelauf: Änderungen geprüft und verworfen (nichts veröffentlicht).')
        return
    call('POST', f'{API}/edits/{edit}:commit')
    print('Übernommen.')


def upload_image(edit, lang, kind, path: Path):
    mime = mimetypes.guess_type(path.name)[0] or 'image/png'
    call('POST', f'{UPLOAD}/edits/{edit}/listings/{lang}/{kind}?uploadType=media', raw=path.read_bytes(), content_type=mime)


def texts():
    """Shared texts plus one entry per language, keyed by this store's locale code."""
    t = store_locales.load()
    t['locales'] = {l['playLocale']: {**l['store'], 'urls': store_locales.legal_urls(l)} for l in t['langs']}
    t['iap']['locales'] = {l['playLocale']: l['iap'] for l in t['langs']}
    return t


def cmd_status(_args):
    edit = new_edit()
    details = call('GET', f'{API}/edits/{edit}/details')
    print('App gefunden. Standardsprache:', details.get('defaultLanguage'), '· Kontakt:', details.get('contactEmail'))
    for track in call('GET', f'{API}/edits/{edit}/tracks').get('tracks', []):
        for r in track.get('releases', []):
            print(f"  {track['track']}: {r.get('name')} {r.get('status')} versionCodes={r.get('versionCodes')}")
    call('DELETE', f'{API}/edits/{edit}')


def cmd_eintrag(args):
    t = texts()
    primary = t['primaryLocale']
    edit = new_edit()
    call('PUT', f'{API}/edits/{edit}/details', {
        'defaultLanguage': primary, 'contactEmail': t['review']['email'],
        'contactWebsite': t['locales'][primary]['urls']['marketing'],
    })
    for lang, l in t['locales'].items():
        call('PUT', f'{API}/edits/{edit}/listings/{lang}', {
            'language': lang, 'title': l['googleTitle'],
            'shortDescription': l['shortDescription'], 'fullDescription': l['description'],
        })
        # Icon and feature graphic allow one image each; clear first so a rerun replaces them.
        for kind, image in (('icon', STORE / 'play' / 'icon-512.png'),
                            ('featureGraphic', STORE / 'play' / f'feature-1024x500-{lang}.png')):
            call('DELETE', f'{API}/edits/{edit}/listings/{lang}/{kind}')
            upload_image(edit, lang, kind, image)
        call('DELETE', f'{API}/edits/{edit}/listings/{lang}/phoneScreenshots')
        shots = sorted((STORE / 'screenshots' / 'play' / lang).glob('*.png'))
        if not shots:
            sys.exit(f'Keine Screenshots in store/screenshots/play/{lang}/.')
        for shot in shots:
            upload_image(edit, lang, 'phoneScreenshots', shot)
        print(f'[{lang}] Texte, Icon, Vorstellungsgrafik und {len(shots)} Screenshots vorbereitet.')
    finish(edit, args.ausfuehren)


def cmd_produkt(args):
    """One-time product "Remove ads". Play takes EU prices net of VAT, so 2.49 € ends up as 2.99 €;
    other currencies are converted by Play. Needs the payments profile (exists from Mahjong)."""
    t = texts()
    iap = t['iap']
    sku = iap['productId']
    body = {
        'packageName': PACKAGE, 'sku': sku, 'status': 'active', 'purchaseType': 'managedUser',
        'defaultLanguage': t['primaryLocale'],
        'defaultPrice': {'priceMicros': str(round(float(iap['playPriceEurNet']) * 1_000_000)), 'currency': 'EUR'},
        'listings': {lang: {'title': l['name'], 'description': l['description']} for lang, l in iap['locales'].items()},
    }
    existing = call('GET', f'{API}/inappproducts/{sku}', fatal=False)
    if not args.ausfuehren:
        state = 'fehlt' if existing.get('_error') == 404 else existing.get('status', existing.get('_error'))
        print(f"Probelauf: Produkt {sku} ({state}) – würde {iap['playPriceEurNet']} € netto und Texte {list(iap['locales'])} setzen.")
        return
    if existing.get('_error') == 404:
        call('POST', f'{API}/inappproducts?autoConvertMissingPrices=true', body)
        print(f'Produkt {sku} angelegt und aktiv.')
    elif existing.get('_error'):
        sys.exit(f"Produkt nicht lesbar ({existing['_error']}): {existing['_detail'][:600]}")
    else:
        call('PUT', f'{API}/inappproducts/{sku}?autoConvertMissingPrices=true', body)
        print(f'Produkt {sku} aktualisiert.')


def assert_live_ads():
    """Google's sample IDs are fine for testing but must never reach the store."""
    for f in (ROOT / 'app.json', ROOT / 'src' / 'ads' / 'config.ts'):
        if '3940256099942544' in f.read_text():
            sys.exit(f'{f.relative_to(ROOT)} enthält noch Googles Beispiel-IDs – erst die echten AdMob-IDs eintragen.')


def cmd_release(args):
    t = texts()
    if args.ausfuehren and args.track == 'production':
        assert_live_ads()
    edit = new_edit()
    aab = Path(args.aab)
    print(f'Lade {aab.name} hoch ({aab.stat().st_size // 1024} KB) …')
    bundle = call('POST', f'{UPLOAD}/edits/{edit}/bundles?uploadType=media', raw=aab.read_bytes(),
                  content_type='application/octet-stream')
    code = bundle['versionCode']
    call('PUT', f'{API}/edits/{edit}/tracks/{args.track}', {
        'track': args.track,
        'releases': [{
            'name': f"{code} ({t['version']})", 'versionCodes': [str(code)], 'status': args.status,
            # --notes overrides the texts from texte.json in every language.
            'releaseNotes': [{'language': lang, 'text': args.notes or l['releaseNotes']} for lang, l in t['locales'].items()],
        }],
    })
    print(f'versionCode {code} → Track {args.track} ({args.status}).')
    finish(edit, args.ausfuehren)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)
    sub.add_parser('status')
    sub.add_parser('eintrag').add_argument('--ausfuehren', action='store_true')
    sub.add_parser('produkt').add_argument('--ausfuehren', action='store_true')
    r = sub.add_parser('release')
    r.add_argument('--aab', required=True)
    r.add_argument('--track', default='production')
    r.add_argument('--status', default='completed', choices=['completed', 'draft'])
    r.add_argument('--notes', default='')
    r.add_argument('--ausfuehren', action='store_true')
    args = p.parse_args()
    {'status': cmd_status, 'eintrag': cmd_eintrag, 'produkt': cmd_produkt, 'release': cmd_release}[args.cmd](args)


if __name__ == '__main__':
    main()

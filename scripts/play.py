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
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=600) as res:
                text = res.read().decode()
                return json.loads(text) if text else {}
        except urllib.error.HTTPError as e:
            code, detail = e.code, e.read().decode()
            # Google's API answers 5xx now and then (503 "currently unavailable"); try again.
            if code >= 500 and attempt < 3:
                print(f'{method} -> {code}, neuer Versuch …', flush=True)
                time.sleep(5 * 3 ** attempt)
                continue
            break
    if not fatal:
        return {'_error': code, '_detail': detail}
    if code == 404:
        sys.exit(f'Play kennt {PACKAGE} nicht. Bitte die App zuerst in der Play Console anlegen.\n{detail[:400]}')
    if code == 403:
        sys.exit('403 – das Dienstkonto hat für diese App keine Rechte. Play Console → Nutzer und '
                 f'Berechtigungen → Dienstkonto mit Admin-Rechten für die App einladen.\n{detail[:600]}')
    sys.exit(f'{method} {url} -> {code}\n{detail[:1500]}')


def new_edit():
    return call('POST', f'{API}/edits', {})['id']


MANUAL_REVIEW = False  # set once Play refuses to send changes for review by itself


def finish(edit, ausfuehren):
    global MANUAL_REVIEW
    query = '?changesNotSentForReview=true' if MANUAL_REVIEW else ''
    res = call('POST', f'{API}/edits/{edit}:validate{query}', fatal=False)
    if res.get('_error') == 400 and 'changesNotSentForReview' in res.get('_detail', ''):
        # After a policy rejection (or with managed publishing) Play won't send changes for
        # review itself: they are committed here and sent from the Play Console.
        MANUAL_REVIEW, query = True, '?changesNotSentForReview=true'
        res = call('POST', f'{API}/edits/{edit}:validate{query}', fatal=False)
    if res.get('_error'):
        sys.exit(f"POST {API}/edits/{edit}:validate -> {res['_error']}\n{res['_detail'][:1500]}")
    if not ausfuehren:
        call('DELETE', f'{API}/edits/{edit}')
        print('Probelauf: Änderungen geprüft und verworfen (nichts veröffentlicht).')
        return
    call('POST', f'{API}/edits/{edit}:commit{query}')
    if MANUAL_REVIEW:
        print('Übernommen, aber NICHT zur Prüfung gesendet: Play Console → Veröffentlichungsübersicht → '
              '„Änderungen zur Überprüfung senden“.')
    else:
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


def money(eur: str) -> dict:
    units, _, cents = f'{float(eur):.2f}'.partition('.')
    return {'currencyCode': 'EUR', 'units': units, 'nanos': int(cents) * 10_000_000}


def cmd_produkt(args):
    """One-time product "Remove ads" via the monetization API (the old inappproducts API is gone).
    Play takes EU prices net of VAT, so 2.49 € ends up as 2.99 €; Play converts the other regions.
    Needs a build with the billing permission uploaded first (even as a draft)."""
    t = texts()
    iap = t['iap']
    sku = iap['productId']
    if not args.ausfuehren:
        print(f"Probelauf: würde Produkt {sku} mit {iap['playPriceEurNet']} € netto in allen Regionen "
              f"und Texten {list(iap['locales'])} anlegen und aktivieren.")
        return
    converted = call('POST', f'{API}/pricing:convertRegionPrices', {'price': money(iap['playPriceEurNet'])})
    version = converted.get('regionVersion', {}).get('version', '2022/02')
    regions = [{'regionCode': code, 'price': r['price'], 'availability': 'AVAILABLE'}
               for code, r in converted['convertedRegionPrices'].items()]
    product = {
        'packageName': PACKAGE, 'productId': sku,
        'listings': [{'languageCode': lang, 'title': l['name'], 'description': l['description']}
                     for lang, l in iap['locales'].items()],
        'purchaseOptions': [{
            'purchaseOptionId': 'buy',
            'buyOption': {'legacyCompatible': True, 'multiQuantityEnabled': False},
            'regionalPricingAndAvailabilityConfigs': regions,
        }],
    }
    result = call('PATCH', f'{API}/onetimeproducts/{sku}?allowMissing=true&regionsVersion.version={version}'
                  '&updateMask=listings,purchaseOptions', product, fatal=False)
    if result.get('_error'):
        sys.exit(f"Produkt {sku} nicht angelegt ({result['_error']}): {result['_detail'][:1200]}")
    print(f'Produkt {sku} angelegt/aktualisiert ({len(regions)} Regionen).')
    state = call('POST', f'{API}/oneTimeProducts/{sku}/purchaseOptions:batchUpdateStates', {'requests': [
        {'activatePurchaseOptionRequest': {'packageName': PACKAGE, 'productId': sku, 'purchaseOptionId': 'buy'}},
    ]}, fatal=False)
    if state.get('_error'):
        sys.exit(f"Produkt {sku} nicht aktiviert ({state['_error']}): {state['_detail'][:1200]}")
    print(f'Produkt {sku} aktiv.')


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

    def set_track(status):
        call('PUT', f'{API}/edits/{edit}/tracks/{args.track}', {
            'track': args.track,
            'releases': [{
                'name': f"{code} ({t['version']})", 'versionCodes': [str(code)], 'status': status,
                # --notes overrides the texts from texte.json in every language.
                'releaseNotes': [{'language': lang, 'text': args.notes or l['releaseNotes']} for lang, l in t['locales'].items()],
            }],
        })
        print(f'versionCode {code} → Track {args.track} ({status}).')

    set_track(args.status)
    check = call('POST', f'{API}/edits/{edit}:validate', fatal=False)
    if check.get('_error') == 400 and 'draft app' in check.get('_detail', ''):
        # An app that was never published only takes draft releases via the API.
        # The first release has to be sent for review once in the Play Console.
        set_track('draft')
        print('Erste Veröffentlichung: Release liegt als ENTWURF bereit. In der Play Console einmal '
              '„Release prüfen“ → „Zur Überprüfung senden“ tippen; ab dem nächsten Release geht es automatisch.')
    elif check.get('_error'):
        sys.exit(f"validate -> {check['_error']}\n{check['_detail'][:1500]}")
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

#!/usr/bin/env python3
"""Google Play for the Tagebuch app: store listing, graphics, upload and release.

Needs PLAY_SERVICE_ACCOUNT_JSON (the service account key, JSON) in the environment.
Everything happens in one Play "edit"; without --ausfuehren it is validated but never committed.

  python3 scripts/play.py status
  python3 scripts/play.py eintrag --ausfuehren                     # texts, icon, feature graphic, screenshots (all locales)
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
    return json.loads((STORE / 'texte.json').read_text())


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
        upload_image(edit, lang, 'icon', STORE / 'play' / 'icon-512.png')
        upload_image(edit, lang, 'featureGraphic', STORE / 'play' / f'feature-1024x500-{lang}.png')
        call('DELETE', f'{API}/edits/{edit}/listings/{lang}/phoneScreenshots')
        shots = sorted((STORE / 'screenshots' / 'play' / lang).glob('*.png'))
        if not shots:
            sys.exit(f'Keine Screenshots in store/screenshots/play/{lang}/.')
        for shot in shots:
            upload_image(edit, lang, 'phoneScreenshots', shot)
        print(f'[{lang}] Texte, Icon, Vorstellungsgrafik und {len(shots)} Screenshots vorbereitet.')
    finish(edit, args.ausfuehren)


def cmd_release(args):
    t = texts()
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
    r = sub.add_parser('release')
    r.add_argument('--aab', required=True)
    r.add_argument('--track', default='production')
    r.add_argument('--status', default='completed', choices=['completed', 'draft'])
    r.add_argument('--notes', default='')
    r.add_argument('--ausfuehren', action='store_true')
    args = p.parse_args()
    {'status': cmd_status, 'eintrag': cmd_eintrag, 'release': cmd_release}[args.cmd](args)


if __name__ == '__main__':
    main()

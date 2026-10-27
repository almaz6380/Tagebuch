#!/usr/bin/env python3
"""App Store Connect for the Tagebuch app: bundle ID, signing profile, store texts, screenshots, review.

Needs ASC_KEY_ID, ASC_ISSUER_ID and ASC_KEY_P8 (the .p8 file, base64) in the environment;
`profil` also IOS_CERT_PASSWORD for the .p12.
Writing commands only change something with --ausfuehren; without it they print what they would do.

  python3 scripts/asc.py status
  python3 scripts/asc.py bundle --ausfuehren          # register io.github.almaz6380.tagebuch
  python3 scripts/asc.py profil --p12 cert.p12 --ausgabe x.mobileprovision --ausfuehren
  python3 scripts/asc.py warten --build 7              # until Apple has processed the upload
  python3 scripts/asc.py metadaten --ausfuehren       # texts, URLs, categories, age rating, screenshots (all locales)
  python3 scripts/asc.py einreichen --build 1 --ausfuehren
"""
import argparse
import base64
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORE = ROOT / 'store'
BUNDLE_ID = 'io.github.almaz6380.tagebuch'
BASE = 'https://api.appstoreconnect.apple.com'
EDITABLE = {'PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY'}


def private_key() -> str:
    raw = os.environ['ASC_KEY_P8'].strip()
    # Stored base64-encoded, like the other apps' secrets; accept a plain PEM too.
    return raw if 'BEGIN' in raw else base64.b64decode(raw).decode()


_token = {'value': '', 'exp': 0}


def token() -> str:
    import jwt  # pyjwt

    now = int(time.time())
    if _token['exp'] - now < 60:
        _token['exp'] = now + 900
        _token['value'] = jwt.encode(
            {'iss': os.environ['ASC_ISSUER_ID'], 'iat': now, 'exp': _token['exp'], 'aud': 'appstoreconnect-v1'},
            private_key(),
            algorithm='ES256',
            headers={'kid': os.environ['ASC_KEY_ID'], 'typ': 'JWT'},
        )
    return _token['value']


def call(method: str, path: str, body=None, ok=(200, 201, 204)):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header('Authorization', f'Bearer {token()}')
    if data is not None:
        req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req) as res:
            text = res.read().decode()
            return json.loads(text) if text else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode()
        if e.code in ok:
            return json.loads(detail) if detail else {}
        sys.exit(f'{method} {path} -> {e.code}\n{detail[:1500]}')


def get(path: str):
    return call('GET', path)


def find_app():
    data = get(f'/v1/apps?filter[bundleId]={BUNDLE_ID}&fields[apps]=name,bundleId,primaryLocale')['data']
    return data[0] if data else None


def require_app():
    app = find_app()
    if not app:
        sys.exit(
            f'Keine App mit Bundle-ID {BUNDLE_ID} in App Store Connect.\n'
            'Bitte zuerst dort anlegen: Apps → + → Neue App (die App selbst kann die API nicht anlegen).'
        )
    return app


def find_bundle():
    data = get(f'/v1/bundleIds?filter[identifier]={BUNDLE_ID}&fields[bundleIds]=identifier,name')['data']
    # filter[identifier] matches prefixes too, so compare exactly.
    return next((b for b in data if b['attributes']['identifier'] == BUNDLE_ID), None)


# ---------------------------------------------------------------- status

def cmd_status(_args):
    bundle = find_bundle()
    print('Bundle-ID:', 'registriert' if bundle else 'fehlt', f'({BUNDLE_ID})')
    app = find_app()
    if not app:
        print('App: noch nicht in App Store Connect angelegt')
        return
    print(f"App: {app['attributes']['name']} (Apple-ID {app['id']})")
    versions = get(f"/v1/apps/{app['id']}/appStoreVersions?fields[appStoreVersions]=versionString,appStoreState&limit=5")
    for v in versions['data']:
        print(f"  Version {v['attributes']['versionString']}: {v['attributes']['appStoreState']}")
    builds = get(f"/v1/builds?filter[app]={app['id']}&sort=-uploadedDate&limit=5&fields[builds]=version,processingState,uploadedDate")
    for b in builds['data']:
        a = b['attributes']
        print(f"  Build {a['version']}: {a['processingState']} ({a['uploadedDate']})")
    subs = get(f"/v1/reviewSubmissions?filter[app]={app['id']}&limit=5&fields[reviewSubmissions]=state,submittedDate")
    for s in subs['data']:
        print(f"  Prüfung {s['id'][:8]}…: {s['attributes']['state']} eingereicht {s['attributes']['submittedDate']}")


# ---------------------------------------------------------------- bundle ID

def cmd_bundle(args):
    if find_bundle():
        print(f'{BUNDLE_ID} ist schon registriert.')
        return
    if not args.ausfuehren:
        print(f'Probelauf: würde {BUNDLE_ID} als App-ID registrieren.')
        return
    call('POST', '/v1/bundleIds', {
        'data': {'type': 'bundleIds', 'attributes': {'identifier': BUNDLE_ID, 'name': 'Tagebuch', 'platform': 'IOS'}}
    })
    print(f'{BUNDLE_ID} registriert.')


# ---------------------------------------------------------------- signing profile

def p12_serial(p12: Path, password: str) -> str:
    from cryptography.hazmat.primitives.serialization import pkcs12

    _key, cert, _extra = pkcs12.load_key_and_certificates(p12.read_bytes(), password.encode())
    return format(cert.serial_number, 'X')


def cmd_profil(args):
    p12 = Path(args.p12)
    if not p12.exists():
        sys.exit(f'Fehlt: {p12}')
    serial = p12_serial(p12, os.environ['IOS_CERT_PASSWORD']).lstrip('0')
    certs = get('/v1/certificates?filter[certificateType]=DISTRIBUTION,IOS_DISTRIBUTION&fields[certificates]=serialNumber,name,expirationDate')['data']
    cert = next((c for c in certs if c['attributes']['serialNumber'].upper().lstrip('0') == serial), None)
    if not cert:
        sys.exit('Das Zertifikat aus IOS_CERT_P12_BASE64 gehört zu keinem gültigen Distributionszertifikat des Teams.')
    bundle = find_bundle()
    if not bundle:
        sys.exit('Bundle-ID fehlt – zuerst: python3 scripts/asc.py bundle --ausfuehren')
    name = 'Tagebuch App Store'
    if not args.ausfuehren:
        print(f"Probelauf: würde Profil „{name}“ mit Zertifikat {cert['attributes']['name']} "
              f"(gültig bis {cert['attributes']['expirationDate'][:10]}) anlegen.")
        return
    # A profile is tied to one certificate; replace older ones with the same name.
    for old in get(f"/v1/bundleIds/{bundle['id']}/profiles?fields[profiles]=name")['data']:
        if old['attributes']['name'] == name:
            call('DELETE', f"/v1/profiles/{old['id']}")
    created = call('POST', '/v1/profiles', {
        'data': {
            'type': 'profiles',
            'attributes': {'name': name, 'profileType': 'IOS_APP_STORE'},
            'relationships': {
                'bundleId': {'data': {'type': 'bundleIds', 'id': bundle['id']}},
                'certificates': {'data': [{'type': 'certificates', 'id': cert['id']}]},
            },
        }
    })
    out = Path(args.ausgabe)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(base64.b64decode(created['data']['attributes']['profileContent']))
    print(f'Profil „{name}“ angelegt: {out}')


# ---------------------------------------------------------------- store texts + screenshots

def store_texts():
    return json.loads((STORE / 'texte.json').read_text())


def editable_version(app_id: str, version: str, ausfuehren: bool):
    versions = get(f'/v1/apps/{app_id}/appStoreVersions?filter[platform]=IOS&fields[appStoreVersions]=versionString,appStoreState')['data']
    for v in versions:
        if v['attributes']['appStoreState'] in EDITABLE:
            if v['attributes']['versionString'] != version and ausfuehren:
                call('PATCH', f"/v1/appStoreVersions/{v['id']}", {
                    'data': {'type': 'appStoreVersions', 'id': v['id'], 'attributes': {'versionString': version}}
                })
            return v
    if not ausfuehren:
        print(f'Probelauf: würde Version {version} anlegen.')
        return None
    return call('POST', '/v1/appStoreVersions', {
        'data': {
            'type': 'appStoreVersions',
            'attributes': {'platform': 'IOS', 'versionString': version},
            'relationships': {'app': {'data': {'type': 'apps', 'id': app_id}}},
        }
    })['data']


def localizations(path: str) -> dict:
    return {l['attributes']['locale']: l for l in get(path)['data']}


def screenshot_files(locale: str):
    files = sorted((STORE / 'screenshots' / 'iphone-69' / locale).glob('*.png'))
    if not files:
        sys.exit(f'Keine Screenshots in store/screenshots/iphone-69/{locale}/.')
    return files


def upload_screenshots(loc_id: str, locale: str):
    files = screenshot_files(locale)
    sets = get(f"/v1/appStoreVersionLocalizations/{loc_id}/appScreenshotSets?fields[appScreenshotSets]=screenshotDisplayType")['data']
    target = next((s for s in sets if s['attributes']['screenshotDisplayType'] == 'APP_IPHONE_67'), None)
    if not target:
        target = call('POST', '/v1/appScreenshotSets', {
            'data': {
                'type': 'appScreenshotSets',
                'attributes': {'screenshotDisplayType': 'APP_IPHONE_67'},
                'relationships': {'appStoreVersionLocalization': {'data': {'type': 'appStoreVersionLocalizations', 'id': loc_id}}},
            }
        })['data']
    for old in get(f"/v1/appScreenshotSets/{target['id']}/appScreenshots")['data']:
        call('DELETE', f"/v1/appScreenshots/{old['id']}")
    for f in files:
        blob = f.read_bytes()
        shot = call('POST', '/v1/appScreenshots', {
            'data': {
                'type': 'appScreenshots',
                'attributes': {'fileName': f.name, 'fileSize': len(blob)},
                'relationships': {'appScreenshotSet': {'data': {'type': 'appScreenshotSets', 'id': target['id']}}},
            }
        })['data']
        for op in shot['attributes']['uploadOperations']:
            part = blob[op['offset']:op['offset'] + op['length']]
            req = urllib.request.Request(op['url'], data=part, method=op['method'])
            for h in op['requestHeaders']:
                req.add_header(h['name'], h['value'])
            urllib.request.urlopen(req).read()
        call('PATCH', f"/v1/appScreenshots/{shot['id']}", {
            'data': {
                'type': 'appScreenshots',
                'id': shot['id'],
                'attributes': {'uploaded': True, 'sourceFileChecksum': hashlib.md5(blob).hexdigest()},
            }
        })
        print(f'  [{locale}] Screenshot hochgeladen:', f.name)


def cmd_metadaten(args):
    t = store_texts()
    apple = t['apple']
    app = require_app()
    app_id = app['id']
    primary = app['attributes'].get('primaryLocale')
    if primary != t['primaryLocale']:
        print(f"Hinweis: Primärsprache in App Store Connect ist {primary}, texte.json erwartet {t['primaryLocale']}.")

    info = get(f'/v1/apps/{app_id}/appInfos')['data'][0]
    info_locs = localizations(f"/v1/appInfos/{info['id']}/appInfoLocalizations")
    version = editable_version(app_id, t['version'], args.ausfuehren)
    version_locs = localizations(f"/v1/appStoreVersions/{version['id']}/appStoreVersionLocalizations") if version else {}

    if not args.ausfuehren:
        print('Probelauf: würde Kategorien, Altersfreigabe, Copyright und Prüfkontakt setzen, dann je Sprache:')
        for locale, l in t['locales'].items():
            neu = '' if locale in info_locs else ' (Sprache wird angelegt, mit Name)'
            print(f"  {locale}{neu}: {l['name']} | {l['subtitle']} ({len(l['subtitle'])}/30)")
            print(f"    Stichwörter ({len(l['keywords'])}/100): {l['keywords']}")
            print(f"    Screenshots: {len(screenshot_files(locale))}")
        return

    for locale, l in t['locales'].items():
        attrs = {'subtitle': l['subtitle'], 'privacyPolicyUrl': l['urls']['privacy']}
        if locale in info_locs:
            # The name is set when the app is created; sending it again triggers a uniqueness check (409).
            lid = info_locs[locale]['id']
            call('PATCH', f'/v1/appInfoLocalizations/{lid}', {
                'data': {'type': 'appInfoLocalizations', 'id': lid, 'attributes': attrs}
            })
        else:
            call('POST', '/v1/appInfoLocalizations', {'data': {
                'type': 'appInfoLocalizations', 'attributes': {'locale': locale, 'name': l['name'], **attrs},
                'relationships': {'appInfo': {'data': {'type': 'appInfos', 'id': info['id']}}},
            }})
        vattrs = {
            'description': l['description'],
            'keywords': l['keywords'],
            'promotionalText': l['promotionalText'],
            'supportUrl': l['urls']['support'],
            'marketingUrl': l['urls']['marketing'],
        }
        if locale in version_locs:
            vid = version_locs[locale]['id']
            call('PATCH', f'/v1/appStoreVersionLocalizations/{vid}', {
                'data': {'type': 'appStoreVersionLocalizations', 'id': vid, 'attributes': vattrs}
            })
        else:
            vid = call('POST', '/v1/appStoreVersionLocalizations', {'data': {
                'type': 'appStoreVersionLocalizations', 'attributes': {'locale': locale, **vattrs},
                'relationships': {'appStoreVersion': {'data': {'type': 'appStoreVersions', 'id': version['id']}}},
            }})['data']['id']
        print(f'[{locale}] Texte gesetzt.')
        upload_screenshots(vid, locale)

    call('PATCH', f"/v1/appInfos/{info['id']}", {
        'data': {'type': 'appInfos', 'id': info['id'], 'relationships': {
            'primaryCategory': {'data': {'type': 'appCategories', 'id': apple['primaryCategory']}},
            'secondaryCategory': {'data': {'type': 'appCategories', 'id': apple['secondaryCategory']}},
        }}
    })
    age = get(f"/v1/appInfos/{info['id']}/ageRatingDeclaration")['data']
    call('PATCH', f"/v1/ageRatingDeclarations/{age['id']}", {
        'data': {'type': 'ageRatingDeclarations', 'id': age['id'], 'attributes': apple['ageRating']}
    })
    call('PATCH', f"/v1/appStoreVersions/{version['id']}", {
        'data': {'type': 'appStoreVersions', 'id': version['id'], 'attributes': {'copyright': t['copyright']}}
    })
    review = t['review']
    existing = get(f"/v1/appStoreVersions/{version['id']}/appStoreReviewDetail")
    attrs = {
        'contactFirstName': review['firstName'], 'contactLastName': review['lastName'],
        'contactEmail': review['email'], 'contactPhone': review['phone'],
        'demoAccountRequired': False, 'notes': review['notes'],
    }
    if existing.get('data'):
        rid = existing['data']['id']
        call('PATCH', f'/v1/appStoreReviewDetails/{rid}', {'data': {'type': 'appStoreReviewDetails', 'id': rid, 'attributes': attrs}})
    else:
        call('POST', '/v1/appStoreReviewDetails', {'data': {
            'type': 'appStoreReviewDetails', 'attributes': attrs,
            'relationships': {'appStoreVersion': {'data': {'type': 'appStoreVersions', 'id': version['id']}}},
        }})
    print('Kategorien, Altersfreigabe, Copyright und Prüfkontakt gesetzt.')


def cmd_warten(args):
    app = require_app()
    deadline = time.time() + args.minuten * 60
    while True:
        builds = get(f"/v1/builds?filter[app]={app['id']}&filter[version]={args.build}&fields[builds]=processingState")['data']
        state = builds[0]['attributes']['processingState'] if builds else 'NOCH_NICHT_DA'
        print(f'Build {args.build}: {state}', flush=True)
        if state == 'VALID':
            return
        if state in ('FAILED', 'INVALID'):
            sys.exit(f'Apple hat Build {args.build} abgelehnt ({state}) – Details in App Store Connect.')
        if time.time() > deadline:
            sys.exit(f'Build {args.build} nach {args.minuten} min noch nicht verarbeitet.')
        time.sleep(60)


# ---------------------------------------------------------------- submit for review

def cmd_einreichen(args):
    t = store_texts()
    app = require_app()
    builds = get(f"/v1/builds?filter[app]={app['id']}&filter[version]={args.build}&fields[builds]=version,processingState,usesNonExemptEncryption")['data']
    if not builds:
        sys.exit(f'Build {args.build} ist noch nicht in App Store Connect angekommen.')
    build = builds[0]
    state = build['attributes']['processingState']
    if state != 'VALID':
        sys.exit(f'Build {args.build} ist noch nicht fertig verarbeitet ({state}). In ein paar Minuten erneut versuchen.')
    version = editable_version(app['id'], t['version'], args.ausfuehren)
    if not args.ausfuehren:
        print(f"Probelauf: würde Build {args.build} an Version {t['version']} hängen und zur Prüfung senden.")
        return
    call('PATCH', f"/v1/appStoreVersions/{version['id']}/relationships/build", {'data': {'type': 'builds', 'id': build['id']}})
    open_subs = get(f"/v1/reviewSubmissions?filter[app]={app['id']}&filter[state]=READY_FOR_REVIEW,UNRESOLVED_ISSUES&fields[reviewSubmissions]=state")['data']
    if open_subs:
        sub = open_subs[0]
    else:
        sub = call('POST', '/v1/reviewSubmissions', {'data': {
            'type': 'reviewSubmissions', 'attributes': {'platform': 'IOS'},
            'relationships': {'app': {'data': {'type': 'apps', 'id': app['id']}}},
        }})['data']
        call('POST', '/v1/reviewSubmissionItems', {'data': {
            'type': 'reviewSubmissionItems',
            'relationships': {
                'reviewSubmission': {'data': {'type': 'reviewSubmissions', 'id': sub['id']}},
                'appStoreVersion': {'data': {'type': 'appStoreVersions', 'id': version['id']}},
            },
        }})
    call('PATCH', f"/v1/reviewSubmissions/{sub['id']}", {
        'data': {'type': 'reviewSubmissions', 'id': sub['id'], 'attributes': {'submitted': True}}
    })
    print(f"Zur Prüfung eingereicht: Version {t['version']}, Build {args.build} (reviewSubmission {sub['id']}).")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='cmd', required=True)
    sub.add_parser('status')
    for name in ('bundle', 'metadaten'):
        sub.add_parser(name).add_argument('--ausfuehren', action='store_true')
    p = sub.add_parser('profil')
    p.add_argument('--p12', required=True)
    p.add_argument('--ausgabe', required=True)
    p.add_argument('--ausfuehren', action='store_true')
    p = sub.add_parser('warten')
    p.add_argument('--build', required=True)
    p.add_argument('--minuten', type=int, default=45)
    p = sub.add_parser('einreichen')
    p.add_argument('--build', required=True)
    p.add_argument('--ausfuehren', action='store_true')
    args = parser.parse_args()
    {'status': cmd_status, 'bundle': cmd_bundle, 'profil': cmd_profil, 'warten': cmd_warten,
     'metadaten': cmd_metadaten, 'einreichen': cmd_einreichen}[args.cmd](args)


if __name__ == '__main__':
    main()

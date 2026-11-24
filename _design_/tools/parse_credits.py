"""Parse the supplied credits HTML into structured JSON and report coverage against discography.json."""
import sys, re, json, html, collections

src, disco_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(src, encoding='utf-8').read()
s = re.sub(r'<style.*?</style>', '', s, flags=re.S)
strip = lambda x: html.unescape(re.sub(r'<[^>]+>', '', x)).strip()
disco = json.load(open(disco_path, encoding='utf-8'))
by_title = {a['title']: a for a in disco['albums']}

albums, people = [], None
for m in re.finditer(r'<section class="(album|people)"[^>]*>(.*?)</section>', s, re.S):
    kind, sec = m.group(1), m.group(2)
    if kind == 'people':
        people = strip(sec)[:1500]
        continue
    title = strip(re.search(r'<h2.*?</h2>', sec, re.S).group(0))
    meta = strip(re.search(r'<p class="meta">(.*?)</p>', sec, re.S).group(1))
    rows = []
    for tr in re.finditer(r'<tr class="([^"]*)">(.*?)</tr>', sec, re.S):
        cls, row = tr.group(1), tr.group(2)
        cell = lambda c: (lambda mm: strip(mm.group(1)) if mm else None)(re.search(r'<td class="%s[^"]*">(.*?)</td>' % c, row, re.S))
        t = re.search(r'<div class="title">(.*?)</div>', row, re.S)
        note = re.search(r'<div class="note">(.*?)</div>', row, re.S)
        link = re.search(r'<td class="lyrics">.*?href="([^"]+)"', row, re.S)
        rows.append({
            'no': int(cell('no')) if (cell('no') or '').isdigit() else cell('no'),
            'title': strip(re.sub(r'<span.*?</span>', '', t.group(1), flags=re.S)) if t else None,
            'firstOn': (lambda mm: mm.group(1).strip() if mm else None)(re.search(r'首見\s*([^<]+)', t.group(1))) if t else None,
            'missing': 'missing' in cls,
            'composer': cell('composer'), 'lyricist': cell('lyricist'),
            'arranger': cell('arranger'), 'producer': cell('producer'),
            'lyricsUrl': html.unescape(link.group(1)) if link else None,
            'note': strip(note.group(1)) if note else None,
        })
    albums.append({'title': title, 'albumId': by_title.get(title, {}).get('id'), 'meta': meta, 'tracks': rows})

json.dump({'source': 'rubberband-credits.html (updated 2026-11-24)', 'albums': albums}, open(out_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# coverage report
print('missing rows:', sum(r['missing'] for a in albums for r in a['tracks']), 'dup rows:', sum(1 for a in albums for r in a['tracks'] if r['firstOn']))
credited = {}
for a in albums:
    for r in a['tracks']:
        if r['composer'] and r['composer'] not in ('—', '-', ''):
            credited.setdefault(r['title'], r)
tot = hit_direct = hit_title = 0
miss = collections.Counter()
for a in disco['albums']:
    ca = next((x for x in albums if x['albumId'] == a['id']), None)
    cmap = {r['no']: r for r in ca['tracks']} if ca else {}
    d = t2 = 0
    for t in a['tracks']:
        tot += 1
        r = cmap.get(t['no'])
        if r and r['title'] == t['title'] and r['composer'] and r['composer'] not in ('—', '-'):
            hit_direct += 1; d += 1
        elif t['title'] in credited:
            hit_title += 1; t2 += 1
        else:
            miss[a['title']] += 1
    print(f"{a['id']:28} tracks={len(a['tracks']):3} creditRows={len(cmap):3} direct={d:3} byTitle={t2:3} missing={len(a['tracks'])-d-t2}")
print('total', tot, 'direct', hit_direct, 'byTitle', hit_title, 'missing', tot - hit_direct - hit_title)
print('unmatched album titles in credits:', [a['title'] for a in albums if not a['albumId']])
print('sample row:', json.dumps(albums[2]['tracks'][0], ensure_ascii=False))
print('empty-credit samples:', [(a['title'], r['title'], r['composer']) for a in albums for r in a['tracks'] if not r['composer'] or r['composer'] in ('—','-')][:8])
print('people:', (people or '')[:400])

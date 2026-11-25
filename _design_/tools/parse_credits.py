"""Parse the supplied credits HTML into structured JSON and report coverage against discography.json.

Usage (from the repo root; all three paths are optional and default to these):

    python3 _design_/tools/parse_credits.py \
        _design_/rubberband-credits.html apps/api/seed/discography.json apps/api/seed/credits.json

Run parse_discography.py first: credit sections are tied to releases by title, through the
ids in discography.json. Standard library only, no network; the same inputs always give the
same bytes. The `source` line takes its date from the page header ("更新 YYYY-MM-DD").
"""
import argparse
import collections
import html
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = REPO / '_design_' / 'rubberband-credits.html'
DEFAULT_DISCOGRAPHY = REPO / 'apps' / 'api' / 'seed' / 'discography.json'
DEFAULT_OUTPUT = REPO / 'apps' / 'api' / 'seed' / 'credits.json'
NO_VALUE = ('—', '-', '')


class SourceError(Exception):
    """The source page does not look the way this script expects."""


def strip(fragment):
    return html.unescape(re.sub(r'<[^>]+>', '', fragment)).strip()


def updated_date(page):
    match = re.search(r'更新\s*(\d{4}-\d{2}-\d{2})', page)
    if not match:
        raise SourceError('no "更新 YYYY-MM-DD" date in the page header')
    return match.group(1)


def parse_row(cls, row):
    def cell(name):
        match = re.search(r'<td class="%s[^"]*">(.*?)</td>' % name, row, re.S)
        return strip(match.group(1)) if match else None

    title = re.search(r'<div class="title">(.*?)</div>', row, re.S)
    note = re.search(r'<div class="note">(.*?)</div>', row, re.S)
    link = re.search(r'<td class="lyrics">.*?href="([^"]+)"', row, re.S)
    first_on = re.search(r'首見\s*([^<]+)', title.group(1)) if title else None
    return {
        'no': int(cell('no')) if (cell('no') or '').isdigit() else cell('no'),
        'title': strip(re.sub(r'<span.*?</span>', '', title.group(1), flags=re.S)) if title else None,
        'firstOn': first_on.group(1).strip() if first_on else None,
        'missing': 'missing' in cls,
        'composer': cell('composer'),
        'lyricist': cell('lyricist'),
        'arranger': cell('arranger'),
        'producer': cell('producer'),
        'lyricsUrl': html.unescape(link.group(1)) if link else None,
        'note': strip(note.group(1)) if note else None,
    }


def build(page, disco):
    """Credits document and the text of the people section (for the report)."""
    source = f'rubberband-credits.html (updated {updated_date(page)})'
    page = re.sub(r'<style.*?</style>', '', page, flags=re.S)
    by_title = {album['title']: album for album in disco['albums']}
    albums, people = [], None
    for m in re.finditer(r'<section class="(album|people)"[^>]*>(.*?)</section>', page, re.S):
        kind, sec = m.group(1), m.group(2)
        if kind == 'people':
            people = strip(sec)[:1500]
            continue
        title = strip(re.search(r'<h2.*?</h2>', sec, re.S).group(0))
        meta = strip(re.search(r'<p class="meta">(.*?)</p>', sec, re.S).group(1))
        rows = [parse_row(tr.group(1), tr.group(2))
                for tr in re.finditer(r'<tr class="([^"]*)">(.*?)</tr>', sec, re.S)]
        album_id = by_title.get(title, {}).get('id')
        albums.append({'title': title, 'albumId': album_id, 'meta': meta, 'tracks': rows})
    return {'source': source, 'albums': albums}, people


def report(albums, disco, people):
    """Coverage against the discography: the same three outcomes as packages/catalog matchCredits()."""
    rows = [r for a in albums for r in a['tracks']]
    print('rows:', len(rows), 'missing rows:', sum(r['missing'] for r in rows),
          'dup rows:', sum(1 for r in rows if r['firstOn']))
    credited = {}
    for r in rows:
        if r['composer'] and r['composer'] not in NO_VALUE:
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
            if r and r['title'] == t['title'] and r['composer'] and r['composer'] not in NO_VALUE:
                hit_direct += 1
                d += 1
            elif t['title'] in credited:
                hit_title += 1
                t2 += 1
            else:
                miss[a['title']] += 1
        print(f"{a['id']:28} tracks={len(a['tracks']):3} creditRows={len(cmap):3} "
              f"direct={d:3} byTitle={t2:3} missing={len(a['tracks']) - d - t2}")
    print('total', tot, 'direct', hit_direct, 'byTitle', hit_title,
          'missing', tot - hit_direct - hit_title)
    print('unmatched album titles in credits:', [a['title'] for a in albums if not a['albumId']])
    print('people:', (people or '')[:400])


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('source', nargs='?', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('discography', nargs='?', type=Path, default=DEFAULT_DISCOGRAPHY)
    parser.add_argument('output', nargs='?', type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    disco = json.loads(args.discography.read_text(encoding='utf-8'))
    try:
        document, people = build(args.source.read_text(encoding='utf-8'), disco)
    except SourceError as error:
        sys.exit(f'parse_credits: {error}')
    args.output.write_text(json.dumps(document, ensure_ascii=False, indent=1), encoding='utf-8')
    report(document['albums'], disco, people)


if __name__ == '__main__':
    main()

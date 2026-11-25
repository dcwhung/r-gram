"""Generate apps/api/seed/discography.json from _design_/rubberband-discography.html.

Usage (from the repo root; both paths are optional and default to these):

    python3 _design_/tools/parse_discography.py \
        _design_/rubberband-discography.html apps/api/seed/discography.json

Standard library only, no network (the cover and video URLs in the page are copied as
text, never fetched). The output depends on the source file alone, so running the script
twice gives the same bytes. Rules (Functional Spec CR-004, Technical Spec "內容資料重新生成"):

- Every release carries `category` (short name, D43) and `categoryNo` (the ordinal the
  source file states, e.g. "第 2 張迷你專輯"). Both are checked against the file.
- Release ids come from ALBUM_IDS, an explicit table keyed by the release title: ids
  never change once given (favourites, resume and media folder names depend on them),
  and a Chinese title cannot be turned into an id automatically. A release missing from
  the table stops the script.
- `order` follows D47 (proposal): by category in the order of the source file, then
  by ordinal.
- `type` is the Chinese name of the category (D44, until the user decides).
- A release date that is not a full YYYY-MM-DD (e.g. "2016-06") gives releaseDate and
  year null, the same as the Backend (year follows the release date); the original line
  stays in `sourceMeta`.
"""
import argparse
import html
import json
import re
import sys
import unicodedata
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = REPO / '_design_' / 'rubberband-discography.html'
DEFAULT_OUTPUT = REPO / 'apps' / 'api' / 'seed' / 'discography.json'

# Category heading in the source file -> short name (packages/catalog RELEASE_CATEGORIES).
CATEGORY_SLUGS = {
    '錄音室專輯': 'album',
    '迷你專輯': 'ep',
    '精選': 'best',
    '現場專輯': 'live',
    '電影原聲': 'ost',
    '單曲': 'single',
}

# Release title (the <h2> of its section) -> id. The first 16 are the ids of the previous
# seed data and must not change; the last 5 were given to the user as folder names (U-13).
ALBUM_IDS = {
    'Apollo 18': 'apollo-18',
    'Beaming': 'beaming',
    'Connected': 'connected',
    'Dedicated To…': 'dedicated-to',
    'Easy': 'easy',
    'Frank': 'frank',
    'Gotta Go': 'gotta-go',
    'Hours': 'hours',
    'i': 'i',
    'JUNTOS': 'juntos',
    'KOMOREBI': 'komorebi',
    '¿Frank?': 'frank-ep',
    'We Are RubberBand': 'we-are-rubberband',
    'RubberBand Concert #1': 'rubberband-concert-1',
    'RubberBand Ciao 2021 (Live)': 'rubberband-ciao-2021-live',
    '電影《逆流大叔》原聲大碟': 'men-on-the-dragon-ost',
    '呢度': 'ni-dou',
    '在一起': 'zoi-jat-hei',
    '橡芽': 'zoeng-ngaa',
    '終於好天氣（方皓玟 × RubberBand）': 'zung-jyu-hou-tin-hei',
    '讓世界都懂': 'joeng-sai-gaai-dou-dung',
}

WHEEL_KEY_FALLBACK = '?'
SEPARATOR = ' · '
FULL_DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
BLOCK = re.compile(
    r'<h2 class="cat-title">(?P<category>.*?)</h2>'
    r'|<section class="album" id="[^"]*">(?P<album>.*?)</section>',
    re.S,
)
TRACK = re.compile(r'<li class="track[^"]*">(.*?)</li>', re.S)


class SourceError(Exception):
    """The source file does not look the way this script expects."""


def text(fragment):
    """Visible text of an HTML fragment."""
    return html.unescape(re.sub(r'<[^>]+>', '', fragment)).strip()


def first(pattern, fragment):
    """Text of the first group of `pattern` in `fragment`, or None."""
    match = re.search(pattern, fragment, re.S)
    return text(match.group(1)) if match else None


def required(pattern, fragment, what):
    value = first(pattern, fragment)
    if value is None:
        raise SourceError(f'missing {what}')
    return value


def wheel_key(title):
    """Same rule as packages/catalog wheelKeyFor(): first letter or digit, upper case."""
    for char in title:
        if unicodedata.category(char)[0] in 'LN':
            return char.upper()
    return WHEEL_KEY_FALLBACK


def updated_date(page):
    match = re.search(r'更新\s*(\d{4}-\d{2}-\d{2})', page)
    if not match:
        raise SourceError('no "更新 YYYY-MM-DD" date in the page header')
    return match.group(1)


def parse_track(item):
    video = re.search(r'data-video="([^"]+)"[^>]*>(.*?)</button>', item, re.S)
    also_on = first(r'<span class="dup" title="亦收錄於：([^"]*)"', item)
    return {
        'no': int(required(r'<span class="no">(.*?)</span>', item, 'track number')),
        'title': required(r'<span class="title">(.*?)</span>', item, 'track title'),
        'subtitle': first(r'<span class="subtitle">(.*?)</span>', item),
        'youtubeId': video.group(1) if video else None,
        'videoKind': text(video.group(2)).lstrip('▶').strip() if video else None,
        'alsoOn': also_on.split('、') if also_on else [],
    }


def release_fields(meta, category):
    """`2008-09-26 · 錄音室專輯 · 金牌娛樂` -> release date, year, type, label.

    The middle part of the line is the source's own wording ("EP", "演唱會專輯"); `type`
    is the category name instead (D44) and the line itself is kept in `sourceMeta`.
    """
    parts = meta.split(SEPARATOR, 2)
    date = parts[0].strip()
    full = FULL_DATE.match(date) is not None
    return {
        'releaseDate': date if full else None,
        'year': int(date[:4]) if full else None,
        'type': category,
        'label': parts[2].strip() if len(parts) > 2 else '',
    }


def ordinal_of(section, category):
    ordinal = required(r'<p class="ordinal">(.*?)</p>', section, 'ordinal')
    match = re.fullmatch(r'第 (\d+) [張首](.+)', ordinal)
    if not match or match.group(2) != category:
        raise SourceError(f'ordinal "{ordinal}" does not name the category {category}')
    return int(match.group(1))


def check_counts(section, tracks, title):
    stated = required(r'<p class="count">(.*?)</p>', section, 'track count')
    with_video = sum(1 for track in tracks if track['youtubeId'])
    if stated != f'{len(tracks)} 首 · {with_video} 首有影片':
        raise SourceError(f'{title}: counted {len(tracks)} / {with_video}, page says "{stated}"')
    numbers = [track['no'] for track in tracks]
    if numbers != sorted(set(numbers)):
        raise SourceError(f'{title}: track numbers repeat or are out of order')
    return with_video


def parse_album(section, category):
    title = required(r'<h2>(.*?)</h2>', section, 'release title')
    if title not in ALBUM_IDS:
        raise SourceError(f'no id for "{title}": add it to ALBUM_IDS')
    meta = required(r'<p class="meta">(.*?)</p>', section, 'meta line')
    tracks = [parse_track(item) for item in TRACK.findall(section)]
    cover = re.search(r'<img class="cover" src="([^"]+)"', section)
    return {
        'id': ALBUM_IDS[title],
        'category': CATEGORY_SLUGS[category],
        'categoryNo': ordinal_of(section, category),
        'wheelKey': wheel_key(title),
        'title': title,
        **release_fields(meta, category),
        'coverUrl': html.unescape(cover.group(1)) if cover else None,
        'trackCount': len(tracks),
        'tracksWithVideo': check_counts(section, tracks, title),
        'tracks': tracks,
        'sourceMeta': meta,
        'sourceNotes': first(r'<p class="notes">(.*?)</p>', section),
    }


def parse_albums(page):
    """Releases in page order, each with the category heading above it."""
    category, albums = None, []
    for block in BLOCK.finditer(page):
        if block.group('category') is not None:
            category = text(block.group('category'))
            if category not in CATEGORY_SLUGS:
                raise SourceError(f'unknown category heading "{category}"')
        elif category is None:
            raise SourceError('a release comes before any category heading')
        else:
            albums.append(parse_album(block.group('album'), category))
    return albums


def in_d47_order(albums):
    """D47: category in the order of the source file, then ordinal; order counts from 0."""
    categories = list(dict.fromkeys(album['category'] for album in albums))
    ranked = sorted(albums, key=lambda a: (categories.index(a['category']), a['categoryNo']))
    return [{'order': index, **album} for index, album in enumerate(ranked)]


def check_unique(albums):
    for key in ('id', 'title'):
        values = [album[key] for album in albums]
        if len(values) != len(set(values)):
            raise SourceError(f'two releases share a {key}')
    pairs = [(album['category'], album['categoryNo']) for album in albums]
    if len(pairs) != len(set(pairs)):
        raise SourceError('two releases share a category and ordinal')


def unused_ids(albums):
    """ALBUM_IDS entries whose release is no longer on the page (a removed or renamed title)."""
    return sorted(set(ALBUM_IDS) - {album['title'] for album in albums})


def check_totals(page, albums):
    stats = re.search(r'<b>(\d+)</b> 張專輯</span><span><b>(\d+)</b> 首歌', page)
    if not stats:
        raise SourceError('no album / song totals in the page header')
    songs = sum(album['trackCount'] for album in albums)
    if (len(albums), songs) != (int(stats.group(1)), int(stats.group(2))):
        raise SourceError(f'parsed {len(albums)} releases / {songs} songs, page says otherwise')


def build(page):
    page = re.sub(r'<(style|script|svg)\b.*?</\1>', '', page, flags=re.S)
    albums = parse_albums(page)
    check_unique(albums)
    check_totals(page, albums)
    source = f'rubberband-discography.html (updated {updated_date(page)})'
    return {'source': source, 'albums': in_d47_order(albums)}


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('source', nargs='?', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('output', nargs='?', type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    try:
        document = build(args.source.read_text(encoding='utf-8'))
    except SourceError as error:
        sys.exit(f'parse_discography: {error}')
    args.output.write_text(json.dumps(document, ensure_ascii=False, indent=2), encoding='utf-8')
    albums = document['albums']
    if unused_ids(albums):
        print(f'warning: ALBUM_IDS names releases not on the page: {unused_ids(albums)}',
              file=sys.stderr)
    songs = sum(album['trackCount'] for album in albums)
    print(f'{len(albums)} releases, {songs} songs -> {args.output}')
    for album in albums:
        folder = f"{album['category']}-{album['categoryNo']:02d}-{album['id']}"
        print(f"  {album['order']:2} {folder:40} {album['trackCount']:3} {album['title']}")


if __name__ == '__main__':
    main()

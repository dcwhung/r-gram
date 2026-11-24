"""Turns the discography page into structured JSON for the app: albums, tracks, video ids, wheel keys."""
import sys, re, json, html

SRC, OUT = sys.argv[1:3]
page = open(SRC, encoding='utf-8').read()

# titles whose slug would clash or come out empty
ID_OVERRIDES = {'¿Frank?': 'frank-ep', '電影《逆流大叔》原聲大碟': 'men-on-the-dragon-ost', '單曲（未收錄於專輯）': 'singles'}

def wheel_key(title):
    # Latin titles use their first letter (A-Z); Chinese titles use their first character.
    for ch in title:
        if ch.isalpha():
            return ch.upper() if ch.isascii() else ch
    return title[:1]

albums = []
for order, sec in enumerate(re.findall(r'<section class="album".*?</section>', page, re.S)):
    title = html.unescape(re.search(r'<h2>(.*?)</h2>', sec).group(1))
    meta = [part.strip() for part in html.unescape(re.search(r'<p class="meta">(.*?)</p>', sec).group(1)).split('·')]
    date = meta[0] if re.match(r'\d{4}', meta[0]) else None
    cover = re.search(r'<img class="cover" src="([^"]+)"', sec)
    notes = re.search(r'<p class="notes">(.*?)</p>', sec, re.S)
    tracks = []
    for li in re.findall(r'<li class="track[^"]*">.*?</li>', sec, re.S):
        sub = re.search(r'<span class="subtitle">(.*?)</span>', li)
        dup = re.search(r'<span class="dup" title="亦收錄於：(.*?)"', li)
        video = re.search(r'data-video="([^"]+)"[^>]*>▶ (.*?)</button>', li)
        tracks.append({
            'no': int(re.search(r'<span class="no">(\d+)</span>', li).group(1)),
            'title': html.unescape(re.search(r'<span class="title">(.*?)</span>', li).group(1)),
            'subtitle': html.unescape(sub.group(1)) if sub else None,
            'youtubeId': video.group(1) if video else None,
            'videoKind': html.unescape(video.group(2)) if video else None,
            'alsoOn': [html.unescape(x) for x in dup.group(1).split('、')] if dup else [],
        })
    albums.append({
        'order': order,
        'id': ID_OVERRIDES.get(title) or re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-'),
        'wheelKey': wheel_key(title),
        'title': title,
        'releaseDate': date,
        'year': int(date[:4]) if date else None,
        'type': meta[1] if date and len(meta) > 1 else meta[0],
        'label': meta[-1] if len(meta) > 1 else None,
        'coverUrl': cover.group(1) if cover else None,
        'trackCount': len(tracks),
        'tracksWithVideo': sum(1 for t in tracks if t['youtubeId']),
        'tracks': tracks,
        'sourceNotes': html.unescape(notes.group(1)) if notes else None,
    })
json.dump({'source': 'rubberband-discography.html (updated 2026-11-20)', 'albums': albums}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
ids = [a['id'] for a in albums]
print('albums', len(albums), '| tracks', sum(a['trackCount'] for a in albums), '| with video', sum(a['tracksWithVideo'] for a in albums))
print('duplicate ids:', sorted({i for i in ids if ids.count(i) > 1}))
for a in albums: print(f"{a['wheelKey']:2} {a['id']:32} {a['releaseDate']} {a['type']:14} {a['trackCount']:3} {a['tracksWithVideo']:3} cover={'y' if a['coverUrl'] else 'n'}")
print('video kinds:', sorted({t['videoKind'] for a in albums for t in a['tracks'] if t['videoKind']}))

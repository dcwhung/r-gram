"""由 template.html + 初始資料砌出 ../index.html（單一檔案，冇外部依賴）。

用法（喺 _mockups_/admin 入面）：python3 src/build.py
資料：apps/api/seed/discography.json、credits.json（只抽 mockup 用到嘅欄位）。
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SEED = HERE.parents[2] / 'apps' / 'api' / 'seed'
DEMO_ALBUM = 'apollo-18'
NO_VALUE = '—'
# 設計稿 v16 嘅預設專輯色（_mockups_/r-gram/src/anim.js）；冇嘅用中性灰
ACCENTS = {
    'apollo-18': '#2b4bd6', 'beaming': '#d49b00', 'rubberband-concert-1': '#e4267b', 'connected': '#0f8b8d',
    'dedicated-to': '#a12a45', 'easy': '#3d8fb8', 'frank': '#d7263d', 'frank-ep': '#d7263d',
    'we-are-rubberband': '#c1121f', 'gotta-go': '#1f9a5c', 'hours': '#4a44c8', 'i': '#6f6f6f',
    'rubberband-ciao-2021-live': '#b0413e', 'men-on-the-dragon-ost': '#1565c0', 'juntos': '#e8611a',
    'komorebi': '#2f8a4f', 'singles': '#6e6e6e',
}
NEUTRAL = '#6e6e6e'
# 同播放端設計稿用同一套字體（RB Slab）
FONTS = HERE.parents[1] / 'home-turntable' / 'src' / 'fonts.css'
FONTS_MARKER = '/*__FONTS__*/'


def clean(value):
    return None if value in (None, '', NO_VALUE) else value


def main():
    discography = json.loads((SEED / 'discography.json').read_text(encoding='utf-8'))
    credits = json.loads((SEED / 'credits.json').read_text(encoding='utf-8'))
    albums = [
        {
            'id': a['id'], 'title': a['title'], 'year': a['year'], 'key': a['wheelKey'],
            'releaseDate': a['releaseDate'], 'type': a['type'], 'label': a['label'],
            'tracks': len(a['tracks']), 'accent': ACCENTS.get(a['id'], NEUTRAL),
        }
        for a in discography['albums']
    ]
    demo = next(a for a in discography['albums'] if a['id'] == DEMO_ALBUM)
    rows = {t['no']: t for a in credits['albums'] if a['albumId'] == DEMO_ALBUM for t in a['tracks']}
    tracks = [
        {
            'no': t['no'], 'title': t['title'], 'subtitle': t['subtitle'],
            **{k: clean(rows.get(t['no'], {}).get(k)) for k in ('composer', 'lyricist', 'arranger', 'producer', 'lyricsUrl', 'note')},
        }
        for t in demo['tracks']
    ]
    data = json.dumps({'albums': albums, 'tracks': tracks}, ensure_ascii=False, separators=(',', ':'))
    html = (HERE / 'template.html').read_text(encoding='utf-8')
    assert html.count('/*__DATA__*/null') == 1
    assert html.count(FONTS_MARKER) == 1
    html = html.replace(FONTS_MARKER, FONTS.read_text(encoding='utf-8'))
    out = HERE.parent / 'index.html'
    out.write_text(html.replace('/*__DATA__*/null', data), encoding='utf-8')
    print(f'built {out.name} ({out.stat().st_size // 1024} KB), {len(albums)} albums, {len(tracks)} demo tracks')


if __name__ == '__main__':
    main()

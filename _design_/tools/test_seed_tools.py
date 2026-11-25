"""Tests for parse_discography.py and parse_credits.py (standard library only, no network).

Run from the repo root:  python3 -m unittest discover -s _design_/tools
"""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import parse_credits  # noqa: E402
import parse_discography  # noqa: E402
from parse_discography import SourceError  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
SEED = REPO / 'apps' / 'api' / 'seed'


def read(path):
    return path.read_text(encoding='utf-8')


def page(*blocks, totals=(1, 1)):
    """A minimal discography page: header with date and totals, then the given blocks."""
    header = (f'<p class="eyebrow">更新 2026-11-25</p><div class="stats">'
              f'<span><b>{totals[0]}</b> 張專輯</span><span><b>{totals[1]}</b> 首歌</span></div>')
    return header + ''.join(blocks)


def category(name):
    return f'<div class="cat-head"><h2 class="cat-title">{name}</h2></div>'


def release(title, ordinal, meta='2008-09-26 · 錄音室專輯 · R Flat'):
    return (f'<section class="album" id="x"><p class="ordinal">{ordinal}</p><h2>{title}</h2>'
            f'<p class="meta">{meta}</p><p class="count">1 首 · 0 首有影片</p>'
            '<ol class="tracks"><li class="track no-video"><span class="no">01</span>'
            '<span class="name"><span class="title">Hero</span></span></li></ol></section>')


class CommittedSeedTest(unittest.TestCase):
    """The seed files are generated, never edited by hand: a fresh run gives the same bytes."""

    def test_discography_json_is_what_the_script_produces(self):
        document = parse_discography.build(read(parse_discography.DEFAULT_SOURCE))
        expected = json.dumps(document, ensure_ascii=False, indent=2)
        self.assertEqual(read(SEED / 'discography.json'), expected)

    def test_credits_json_is_what_the_script_produces(self):
        disco = json.loads(read(SEED / 'discography.json'))
        document, _ = parse_credits.build(read(parse_credits.DEFAULT_SOURCE), disco)
        expected = json.dumps(document, ensure_ascii=False, indent=1)
        self.assertEqual(read(SEED / 'credits.json'), expected)

    def test_every_credit_section_names_a_release(self):
        disco = json.loads(read(SEED / 'discography.json'))
        document, _ = parse_credits.build(read(parse_credits.DEFAULT_SOURCE), disco)
        self.assertEqual([a['title'] for a in document['albums'] if not a['albumId']], [])

    def test_the_same_source_gives_the_same_output(self):
        source = read(parse_discography.DEFAULT_SOURCE)
        self.assertEqual(parse_discography.build(source), parse_discography.build(source))


class ParseDiscographyTest(unittest.TestCase):
    def test_reads_category_ordinal_and_date_line(self):
        document = parse_discography.build(page(category('錄音室專輯'), release('Hours', '第 8 張錄音室專輯')))
        self.assertEqual(document['source'], 'rubberband-discography.html (updated 2026-11-25)')
        album = document['albums'][0]
        self.assertEqual(
            {k: album[k] for k in ('order', 'id', 'category', 'categoryNo', 'type', 'label', 'year')},
            {'order': 0, 'id': 'hours', 'category': 'album', 'categoryNo': 8,
             'type': '錄音室專輯', 'label': 'R Flat', 'year': 2008})

    def test_orders_by_category_then_ordinal(self):
        blocks = page(category('錄音室專輯'), release('Hours', '第 8 張錄音室專輯'),
                      release('Apollo 18', '第 1 張錄音室專輯'),
                      category('迷你專輯'), release('呢度', '第 2 張迷你專輯'), totals=(3, 3))
        ids = [a['id'] for a in parse_discography.build(blocks)['albums']]
        self.assertEqual(ids, ['apollo-18', 'hours', 'ni-dou'])

    def test_a_month_only_date_gives_no_release_date_or_year(self):
        blocks = page(category('單曲'), release('讓世界都懂', '第 2 首單曲', '2016-06 · 合唱單曲'))
        album = parse_discography.build(blocks)['albums'][0]
        self.assertEqual((album['releaseDate'], album['year'], album['label']), (None, None, ''))
        self.assertEqual(album['sourceMeta'], '2016-06 · 合唱單曲')

    def test_refuses_a_release_without_an_id(self):
        with self.assertRaisesRegex(SourceError, 'ALBUM_IDS'):
            parse_discography.build(page(category('錄音室專輯'), release('New Album', '第 12 張錄音室專輯')))

    def test_refuses_an_unknown_category(self):
        with self.assertRaisesRegex(SourceError, 'unknown category'):
            parse_discography.build(page(category('翻唱'), release('Hours', '第 1 張翻唱')))

    def test_refuses_an_ordinal_of_another_category(self):
        with self.assertRaisesRegex(SourceError, 'does not name the category'):
            parse_discography.build(page(category('錄音室專輯'), release('Hours', '第 1 張精選')))

    def test_refuses_two_releases_with_the_same_category_and_ordinal(self):
        blocks = page(category('錄音室專輯'), release('Hours', '第 1 張錄音室專輯'),
                      release('Apollo 18', '第 1 張錄音室專輯'), totals=(2, 2))
        with self.assertRaisesRegex(SourceError, 'share a category and ordinal'):
            parse_discography.build(blocks)

    def test_refuses_totals_that_do_not_add_up(self):
        blocks = page(category('錄音室專輯'), release('Hours', '第 8 張錄音室專輯'), totals=(2, 1))
        with self.assertRaisesRegex(SourceError, 'page says otherwise'):
            parse_discography.build(blocks)

    def test_wheel_key_follows_wheel_key_for(self):
        cases = {'¿Frank?': 'F', 'i': 'I', '電影《逆流大叔》原聲大碟': '電', '…?!': '?'}
        self.assertEqual({t: parse_discography.wheel_key(t) for t in cases}, cases)


class ParseCreditsTest(unittest.TestCase):
    def test_takes_the_source_date_from_the_page(self):
        document, _ = parse_credits.build('<p>更新 2030-01-02</p>', {'albums': []})
        self.assertEqual(document, {'source': 'rubberband-credits.html (updated 2030-01-02)',
                                    'albums': []})

    def test_refuses_a_page_without_a_date(self):
        with self.assertRaises(SystemExit):
            parse_credits.build('<p>no date</p>', {'albums': []})


if __name__ == '__main__':
    unittest.main()

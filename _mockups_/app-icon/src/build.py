"""Build ../index.html from template.html + the fonts and the logo of the confirmed player mockup.

Inputs (not copied, read from _mockups_/home-turntable/src):
  fonts.css      Rokkitt (the only font allowed in this public repo)
  logo-full.png  user-supplied RubberBand logo (emblem + wordmark, white with alpha)

The icon uses the emblem only (the circled R with its stem): it is cut out of logo-full.png in memory,
as a square whose centre is the centre of the emblem's ring. The wordmark is never embedded.

Run: python3 src/build.py   (from _mockups_/app-icon)
"""
import base64
import io
from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parent
SHARED = SRC.parent.parent / 'home-turntable' / 'src'
FONTS_MARKER = '/*__FONTS__*/'
EMBLEM_MARKER = '__EMBLEM__'
EMBLEM_RING_MARKER = '__EMBLEM_RING__'

INK = 128  # alpha threshold between ink and background
# Measured on logo-full.png (640 x 525): the ring is 388 px across and ends at row 414; the stem starts at row 4;
# the wordmark starts at row 439.
RING_CENTRE = (318, 221)
RING_RADIUS = 194
EMBLEM_HALF = 218  # half the side of the square cut: reaches the top of the stem, stops above the wordmark
RING_TOLERANCE = 4  # px the ring may be off-centre in the cut (left gap vs bottom gap)
QUIET_ROWS = 12  # rows at the bottom of the cut that must be empty (proves the wordmark is not included)


def replace_once(text: str, marker: str, value: str) -> str:
    if text.count(marker) != 1:
        raise SystemExit(f'template.html must contain {marker} exactly once')
    return text.replace(marker, value)


def cut_emblem() -> Image.Image:
    logo = Image.open(SHARED / 'logo-full.png').convert('RGBA')
    cx, cy = RING_CENTRE
    emblem = logo.crop((cx - EMBLEM_HALF, cy - EMBLEM_HALF, cx + EMBLEM_HALF, cy + EMBLEM_HALF))
    side = emblem.width
    below_ring = EMBLEM_HALF + RING_RADIUS + RING_TOLERANCE
    emblem.paste((255, 255, 255, 0), (0, below_ring, side, side))  # drop the faint edge of the wordmark under the ring
    ink = emblem.getchannel('A').point(lambda v: 255 if v > INK else 0)
    if emblem.getchannel('A').crop((0, side - QUIET_ROWS, side, side)).getbbox() is not None:
        raise SystemExit('the emblem cut reaches the wordmark: check RING_CENTRE / EMBLEM_HALF')
    left, top, right, bottom = ink.getbbox()
    if top > QUIET_ROWS:
        raise SystemExit(f'the emblem cut misses the stem: ink box {(left, top, right, bottom)}')
    if abs(left - (side - bottom)) > RING_TOLERANCE:
        raise SystemExit(f'the ring is not centred in the cut: ink box {(left, top, right, bottom)}')
    return emblem


def data_uri(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format='PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buffer.getvalue()).decode('ascii')


def main() -> None:
    html = (SRC / 'template.html').read_text(encoding='utf-8')
    fonts = (SHARED / 'fonts.css').read_text(encoding='utf-8')
    html = replace_once(html, FONTS_MARKER, fonts)
    html = replace_once(html, EMBLEM_MARKER, data_uri(cut_emblem()))
    html = replace_once(html, EMBLEM_RING_MARKER, f'{RING_RADIUS / EMBLEM_HALF:.4f}')
    (SRC.parent / 'index.html').write_text(html, encoding='utf-8')
    print(f'built index.html ({len(html) // 1024} KB)')


if __name__ == '__main__':
    main()

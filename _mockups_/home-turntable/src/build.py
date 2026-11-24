"""Build ../index.html from template.html + fonts.css + logo-full.png.

Run: python3 src/build.py   (from _mockups_/home-turntable)
"""
import base64
from pathlib import Path

SRC = Path(__file__).resolve().parent
FONTS_MARKER = '/*__FONTS__*/'
LOGO_MARKER = '__LOGO_FULL__'


def replace_once(text: str, marker: str, value: str) -> str:
    if text.count(marker) != 1:
        raise SystemExit(f'template.html must contain {marker} exactly once')
    return text.replace(marker, value)


def main() -> None:
    html = (SRC / 'template.html').read_text(encoding='utf-8')
    fonts = (SRC / 'fonts.css').read_text(encoding='utf-8')
    logo = base64.b64encode((SRC / 'logo-full.png').read_bytes()).decode('ascii')
    html = replace_once(html, FONTS_MARKER, fonts)
    html = replace_once(html, LOGO_MARKER, f'data:image/png;base64,{logo}')
    (SRC.parent / 'index.html').write_text(html, encoding='utf-8')
    print(f'built index.html ({len(html) // 1024} KB)')


if __name__ == '__main__':
    main()

"""Build ../index.html from template.html + fonts.css (run: python3 src/build.py from _mockups_/home-turntable)."""
from pathlib import Path

SRC = Path(__file__).resolve().parent
MARKER = '/*__FONTS__*/'


def main() -> None:
    template = (SRC / 'template.html').read_text(encoding='utf-8')
    fonts = (SRC / 'fonts.css').read_text(encoding='utf-8')
    if template.count(MARKER) != 1:
        raise SystemExit(f'template.html must contain {MARKER} exactly once')
    (SRC.parent / 'index.html').write_text(template.replace(MARKER, fonts), encoding='utf-8')
    print('built index.html')


if __name__ == '__main__':
    main()

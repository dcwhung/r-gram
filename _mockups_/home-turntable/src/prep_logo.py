"""Prepare the RubberBand logo (emblem + wordmark) for the Favourites disc.

Input : ../../r-gram/src/assets/logo.png (1144 x 1072, white on black; the user-supplied logo, upscaled 2x)
Output: logo-full.png (white with alpha, cropped to the artwork); prints its height / width ratio.
Run   : python3 src/prep_logo.py   (from _mockups_/home-turntable)
"""
from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parent
LOGO = SRC.parent.parent / 'r-gram' / 'src' / 'assets' / 'logo.png'
WHITE = 128  # threshold between ink and background
BORDER = 60  # the source has a white rounded border near its edges; measure inside it
MARGIN = 6
OUTPUT_WIDTH = 640


def main() -> None:
    image = Image.open(LOGO).convert('L')
    inner = image.crop((BORDER, BORDER, image.width - BORDER, image.height - BORDER))
    left, top, right, bottom = inner.point(lambda v: 255 if v > WHITE else 0).getbbox()
    box = (left + BORDER - MARGIN, top + BORDER - MARGIN, right + BORDER + MARGIN, bottom + BORDER + MARGIN)
    crop = image.crop(box)
    height = round(OUTPUT_WIDTH * crop.height / crop.width)
    crop = crop.resize((OUTPUT_WIDTH, height), Image.LANCZOS)
    logo = Image.new('RGBA', crop.size, (255, 255, 255, 0))
    logo.putalpha(crop)
    logo.save(SRC / 'logo-full.png', optimize=True)
    print(f'artwork box={box} output={logo.size}')
    print(f'LOGO_ASPECT = {height / OUTPUT_WIDTH:.4f}')


if __name__ == '__main__':
    main()

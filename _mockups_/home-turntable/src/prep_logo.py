"""Cut the round R-flat emblem out of the supplied RubberBand logo for the Favourites disc.

Input : ../../r-gram/src/assets/logo.png (1144 x 1072, white on black; the user-supplied logo, upscaled 2x)
Output: logo-emblem.png (white with alpha, square, ring centred); prints the ring radius as a fraction of the half size.
Run   : python3 src/prep_logo.py   (from _mockups_/home-turntable)
"""
from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parent
LOGO = SRC.parent.parent / 'r-gram' / 'src' / 'assets' / 'logo.png'
WHITE = 128  # threshold between ink and background
# Regions measured on the 1144 x 1072 source (the image also has a white rounded border, so stay inside it)
RING_ROWS = range(300, 560)  # rows that cross the ring's left edge
RING_COLUMNS = range(500, 640)  # columns that cross the ring's bottom edge
WORDMARK_TOP = 740  # the wordmark starts just below this row
EMBLEM_TOP = 100  # above the flat sign
MARGIN = 8
OUTPUT_SIZE = 560


def main() -> None:
    image = Image.open(LOGO).convert('L')
    pixels = image.load()
    left = min(x for y in RING_ROWS for x in range(60, image.width // 2) if pixels[x, y] > WHITE)
    right = max(x for y in RING_ROWS for x in range(image.width // 2, image.width - 60) if pixels[x, y] > WHITE and x < 870)
    bottom = max(y for x in RING_COLUMNS for y in range(EMBLEM_TOP, WORDMARK_TOP) if pixels[x, y] > WHITE)
    top = min(y for x in RING_COLUMNS for y in range(EMBLEM_TOP, WORDMARK_TOP) if pixels[x, y] > WHITE)
    centre_x, centre_y = (left + right) / 2, (top + bottom) / 2
    radius = ((right - left) + (bottom - top)) / 4
    emblem_top = min(y for y in range(EMBLEM_TOP, WORDMARK_TOP) for x in range(60, image.width - 60) if pixels[x, y] > WHITE)
    half = max(centre_y - emblem_top, radius) + MARGIN
    box = tuple(round(v) for v in (centre_x - half, centre_y - half, centre_x + half, centre_y + half))
    crop = image.crop(box)
    crop_pixels = crop.load()
    for y in range(max(0, WORDMARK_TOP - box[1]), crop.height):  # blank out the wordmark
        for x in range(crop.width):
            crop_pixels[x, y] = 0
    crop = crop.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)
    emblem = Image.new('RGBA', crop.size, (255, 255, 255, 0))
    emblem.putalpha(crop)
    emblem.save(SRC / 'logo-emblem.png', optimize=True)
    print(f'ring: left={left} right={right} top={top} bottom={bottom} centre=({centre_x},{centre_y}) radius={radius:.1f}')
    print(f'emblem top={emblem_top} half={half:.1f} box={box}')
    print(f'RING_FRACTION = {radius / half:.4f}')


if __name__ == '__main__':
    main()

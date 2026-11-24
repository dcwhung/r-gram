import sys, re, json, html
from PIL import Image, ImageOps
logo_path, html_path, out_dir = sys.argv[1:4]

# --- logo: user-supplied file, upscaled + edge-crisped (no redraw) ---
im = Image.open(logo_path).convert('L')
print('logo size', im.size)
im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
lut = [0 if v < 70 else 255 if v > 185 else int((v - 70) * 255 / 115) for v in range(256)]
im = im.point(lut)
im.save(out_dir + '/logo.png', optimize=True)

# --- album data from the user's discography page ---
src = open(html_path, encoding='utf-8').read()
albums = []
for sec in re.findall(r'<section class="album".*?</section>', src, re.S):
    title = html.unescape(re.search(r'<h2>(.*?)</h2>', sec).group(1))
    meta = html.unescape(re.search(r'<p class="meta">(.*?)</p>', sec).group(1))
    cover = re.search(r'<img class="cover" src="([^"]+)"', sec)
    tracks = [html.unescape(t) for t in re.findall(r'<span class="title">(.*?)</span>', sec)]
    albums.append({'title': title, 'meta': meta, 'cover': cover.group(1) if cover else None, 'tracks': tracks})
json.dump(albums, open(out_dir + '/albums.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for a in albums:
    print(a['title'], '|', a['meta'][:10], '|', len(a['tracks']))

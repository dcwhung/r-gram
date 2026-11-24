// Builds the self-contained, scrubbable HTML version of the motion preview.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FONT_DIR = path.join(ROOT, 'node_modules', '@fontsource');
const COVER_SIZE = '600x600bb';
// wheel key -> album title in the discography data
const COVER_TITLES = {
    A: 'Apollo 18', B: 'Beaming', C: 'Connected', D: 'Dedicated To…', E: 'Easy', F: 'Frank', G: 'Gotta Go', H: 'Hours',
    I: 'i', J: 'JUNTOS', K: 'KOMOREBI', R: 'RubberBand Concert #1', W: 'We Are RubberBand', 電: '電影《逆流大叔》原聲大碟',
};

const b64 = (file) => fs.readFileSync(file).toString('base64');
const albums = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'albums.json'), 'utf8'));
const covers = {};
Object.entries(COVER_TITLES).forEach(([key, title]) => {
    const album = albums.find((entry) => entry.title === title);
    if (album && album.cover) covers[key] = album.cover.replace('1200x1200bb', COVER_SIZE);
});

const html = fs
    .readFileSync(path.join(__dirname, 'template.html'), 'utf8')
    .replace('/*__SLAB_HEAVY__*/', b64(path.join(FONT_DIR, 'rokkitt', 'files', 'rokkitt-latin-800-normal.woff2')))
    .replace('/*__SLAB_LIGHT__*/', b64(path.join(FONT_DIR, 'rokkitt', 'files', 'rokkitt-latin-300-normal.woff2')))
    .replace('/*__LOGO__*/', b64(path.join(ROOT, 'assets', 'logo.png')))
    .replace('/*__COVERS__*/', JSON.stringify(covers, null, 4))
    .replace('/*__ANIM__*/', () => fs.readFileSync(path.join(ROOT, 'anim.js'), 'utf8'));

// the built page is the mockup itself: _mockups_/r-gram/index.html
fs.writeFileSync(path.join(ROOT, '..', 'index.html'), html);
console.log('covers:', Object.keys(covers).join(' '), '| bytes:', html.length);

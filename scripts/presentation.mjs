// Construye la presentación en un único archivo HTML, con todo incrustado:
// tipografía, arte del juego, capturas y el tráiler.
// Uso: node scripts/presentation.mjs [video.mp4] [salida.html]
// Por defecto usa media/trailer-ecomision.mp4 y escribe media/presentacion-ecomision.html.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WASTES } from '../src/game/wastes.js';
import { wasteSVG, binSVG } from '../src/art/wasteArt.js';
import { ecoSVG, reciclinSVG, contaminatorSVG } from '../src/art/characters.js';
import { worldIconSVG, iconSVG } from '../src/art/icons.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO = path.resolve(process.argv[2] || path.join(ROOT, 'media', 'trailer-ecomision.mp4'));
const OUT = path.resolve(process.argv[3] || path.join(ROOT, 'media', 'presentacion-ecomision.html'));
const MIME = VIDEO.endsWith('.webm') ? 'video/webm' : 'video/mp4';

// Capturas del juego tomadas del propio tráiler (sin la franja de textos de abajo).
const FRAMES = { ocean: 14.2, explain: 10.6, boss: 17.3 };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ecomision-pres-'));
const frames = {};
for (const [name, t] of Object.entries(FRAMES)) {
  const out = path.join(tmp, `${name}.jpg`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(t), '-i', VIDEO, '-frames:v', '1',
    '-vf', 'crop=1660:936:130:6,scale=1100:-2', '-q:v', '4', out]);
  frames[name] = fs.readFileSync(out).toString('base64');
}
fs.rmSync(tmp, { recursive: true, force: true });

const assets = {
  wastes: WASTES.map((w) => ({ id: w.id, bin: w.bin, svg: wasteSVG(w.id) })),
  bins: { white: binSVG('white'), black: binSVG('black'), green: binSVG('green') },
  chars: {
    'eco-happy': ecoSVG('happy'), 'eco-sad': ecoSVG('sad'),
    'reciclin-happy': reciclinSVG('happy'), 'contaminator-sneaky': contaminatorSVG('sneaky'),
  },
  worlds: { city: worldIconSVG('city'), forest: worldIconSVG('forest'), ocean: worldIconSVG('ocean') },
  star: iconSVG('star', '#FFD23F'),
  frames,
};

const font = (w) => fs.readFileSync(path.join(ROOT, 'node_modules', '@fontsource', 'fredoka', 'files', `fredoka-latin-${w}-normal.woff2`)).toString('base64');
const html = fs.readFileSync(path.join(ROOT, 'presentation', 'template.html'), 'utf8')
  .replace('__FONT500__', () => font(500))
  .replace('__FONT700__', () => font(700))
  .replace('__ASSETS__', () => JSON.stringify(assets).replace(/</g, '\\u003c'))
  .replace('__VIDEO_TYPE__', MIME)
  .replace('__VIDEO__', () => fs.readFileSync(VIDEO).toString('base64'));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`Listo: ${OUT} (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB)`);

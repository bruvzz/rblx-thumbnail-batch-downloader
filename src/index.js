#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import cliProgress from 'cli-progress';

let sharp = null;
async function loadSharp() {
  if (!sharp) {
    sharp = (await import('sharp')).default;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const argv = yargs(hideBin(process.argv))
  .scriptName('rthumbs')
  .usage('$0 [options]')
  .option('ids', { type: 'string', describe: 'Comma-separated Roblox asset IDs' })
  .option('input', { type: 'string', describe: 'Path to file with asset IDs' })
  .option('size', { type: 'string', default: '420x420' })
  .option('format', { type: 'string', default: 'png', choices: ['png', 'jpg', 'jpeg'] })
  .option('out', { type: 'string', default: path.join(process.cwd(), 'thumbnails') })
  .option('concurrency', { type: 'number', default: Math.max(2, Math.min(8, os.cpus()?.length || 4)) })
  .option('resize', { type: 'number' })
  .option('watermark', { type: 'string' })
  .option('wm-size', { type: 'number', default: 24 })
  .option('meta', { type: 'boolean', default: false })
  .check((args) => { if (!args.ids && !args.input) throw new Error('Provide --ids or --input'); return true; })
  .help()
  .argv;

async function parseIdsFromFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && /^\d+$/.test(l));
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getAssetInfo(id) {
  const url = `https://api.roblox.com/marketplace/productinfo?assetId=${id}`;
  const data = await fetchJson(url);
  return { name: data.Name || id, type: data.AssetType || 'Unknown' };
}

async function getThumbnailUrl(id, size, format) {
  const url = `https://thumbnails.roblox.com/v1/assets?assetIds=${id}&size=${size}&format=${format === 'jpg' ? 'Jpeg' : 'Png'}&isCircular=false`;
  const json = await fetchJson(url);
  return json.data[0]?.imageUrl;
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function processImage(buffer, opts) {
  const { resize, watermark, wmSize, format } = opts;
  if (!resize && !watermark && format === 'png') return buffer;
  await loadSharp();
  let img = sharp(buffer);
  if (resize) img = img.resize(resize, resize, { fit: 'inside' });
  if (watermark) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='200'>
      <style>.wm { fill: rgba(255,255,255,0.8); font-size: ${wmSize}px; }</style>
      <text x='50%' y='50%' text-anchor='middle' class='wm'>${watermark}</text>
    </svg>`;
    img = img.composite([{ input: Buffer.from(svg), gravity: 'southeast' }]);
  }
  return img.toFormat(format === 'jpg' ? 'jpeg' : format).toBuffer();
}

async function main() {
  const outDir = path.resolve(argv.out);
  await fs.ensureDir(outDir);
  let ids = [];
  if (argv.ids) ids.push(...argv.ids.split(',').map((s) => s.trim()));
  if (argv.input) ids.push(...await parseIdsFromFile(argv.input));
  ids = [...new Set(ids)];

  const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progress.start(ids.length, 0);

  const meta = {};
  for (const id of ids) {
    try {
      const info = await getAssetInfo(id);
      const imgUrl = await getThumbnailUrl(id, argv.size, argv.format);
      if (!imgUrl) throw new Error('No thumbnail');
      const buf = await downloadImage(imgUrl);
      const processed = await processImage(buf, { resize: argv.resize, watermark: argv.watermark, wmSize: argv['wm-size'], format: argv.format });
      const typeFolder = path.join(outDir, info.type.replace(/[^a-z0-9]/gi, '_'));
      await fs.ensureDir(typeFolder);
      const filePath = path.join(typeFolder, `${info.name.replace(/[^a-z0-9]/gi, '_')}.${argv.format}`);
      await fs.writeFile(filePath, processed);
      meta[id] = { id, name: info.name, type: info.type, path: filePath };
    } catch (e) {
      console.error(`Error for ${id}: ${e.message}`);
    }
    progress.increment();
  }
  progress.stop();

  if (argv.meta) await fs.writeJson(path.join(outDir, 'thumbnails.json'), meta, { spaces: 2 });
}

main().catch(console.error);

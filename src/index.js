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
    try {
      sharp = (await import('sharp')).default;
    } catch (e) {
      console.error('\n[warn] `sharp` is required for --resize/--watermark. Install with `npm i sharp`.');
      process.exit(1);
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const argv = yargs(hideBin(process.argv))
  .scriptName('rthumbs')
  .usage('$0 [options]')
  .option('ids', {
    type: 'string',
    describe: 'Comma-separated list of Roblox asset IDs',
  })
  .option('input', {
    type: 'string',
    describe: 'Path to a file containing asset IDs (one per line)',
  })
  .option('size', {
    type: 'string',
    default: '420x420',
    describe: 'Thumbnail size (e.g., 150x150, 420x420, 720x720)',
  })
  .option('format', {
    type: 'string',
    default: 'png',
    choices: ['png', 'jpg', 'jpeg'],
    describe: 'Output image format',
  })
  .option('out', {
    type: 'string',
    default: path.join(process.cwd(), 'thumbnails'),
    describe: 'Output directory',
  })
  .option('concurrency', {
    type: 'number',
    default: Math.max(2, Math.min(8, os.cpus()?.length || 4)),
    describe: 'Number of parallel downloads',
  })
  .option('retries', {
    type: 'number',
    default: 3,
    describe: 'Retry attempts per asset on failure',
  })
  .option('resize', {
    type: 'number',
    describe: 'Resize longest edge to this many pixels (post-download)',
  })
  .option('watermark', {
    type: 'string',
    describe: 'Text watermark to overlay (requires sharp)',
  })
  .option('wm-size', {
    type: 'number',
    default: 24,
    describe: 'Watermark font size (px)',
  })
  .option('meta', {
    type: 'boolean',
    default: false,
    describe: 'Export thumbnails.json metadata',
  })
  .check((args) => {
    if (!args.ids && !args.input) {
      throw new Error('Provide --ids or --input');
    }
    return true;
  })
  .help()
  .alias('h', 'help')
  .version('0.1.0')
  .argv;

function parseIdsFromString(str) {
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => /^(\d+)$/.test(s));
}

async function parseIdsFromFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return raw
    .split(/\r?\n/) 
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .filter((line) => /^(\d+)$/.test(line));
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'accept': 'application/json' } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

async function getThumbnailUrlForIds(ids, size, format) {
  const url = new URL('https://thumbnails.roblox.com/v1/assets');
  url.searchParams.set('assetIds', ids.join(','));
  url.searchParams.set('size', size);
  url.searchParams.set('format', format.toLowerCase() === 'jpg' ? 'Jpeg' : 'Png');
  url.searchParams.set('isCircular', 'false');
  const json = await fetchJson(url.toString());

  return json.data.map((d) => ({ id: String(d.targetId), imageUrl: d.imageUrl, state: d.state }));
}

async function downloadToBuffer(url, retries = 3) {
  let lastErr = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    } catch (e) {
      lastErr = e;

      await new Promise((r) => setTimeout(r, attempt * 500));
    }
  }
  throw lastErr;
}

async function processImage(buffer, options) {
  const { resize, watermark, wmSize, format } = options;
  if (!resize && !watermark) {

    if (format && format !== 'png') {
      await loadSharp();
      return await sharp(buffer).toFormat(format === 'jpg' ? 'jpeg' : format).toBuffer();
    }
    return buffer;
  }
  await loadSharp();
  let img = sharp(buffer);
  if (resize) {
    img = img.resize({ width: resize, height: resize, fit: 'inside', withoutEnlargement: true });
  }
  if (watermark) {

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200">
      <style>
        .wm { fill: rgba(255,255,255,0.85); font-size: ${wmSize}px; font-family: sans-serif; }
      </style>
      <text x="50%" y="50%" text-anchor="middle" class="wm">${escapeXml(watermark)}</text>
    </svg>`;
    const overlay = Buffer.from(svg);
    const { width, height } = await img.metadata();
    img = await img
      .composite([{ input: overlay, gravity: 'southeast', top: (height || 0) - 120, left: (width || 0) - 420, }])
      .ensureAlpha();
  }
  const fmt = format === 'jpg' ? 'jpeg' : (format || 'png');
  return await img.toFormat(fmt).toBuffer();
}

function escapeXml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

async function main() {
  const outDir = path.resolve(argv.out);
  await fs.ensureDir(outDir);

  let ids = [];
  if (argv.ids) ids.push(...parseIdsFromString(argv.ids));
  if (argv.input) ids.push(...await parseIdsFromFile(argv.input));
  ids = Array.from(new Set(ids));

  if (ids.length === 0) {
    console.error('No valid numeric IDs found.');
    process.exit(1);
  }

  console.log(`Found ${ids.length} asset ID(s). Size=${argv.size}, Format=${argv.format.toUpperCase()}, Concurrency=${argv.concurrency}`);

  const meta = {};
  const progress = new cliProgress.SingleBar({ clearOnComplete: true }, cliProgress.Presets.shades_classic);
  progress.start(ids.length, 0);

  let completed = 0;


  const queue = [...ids];
  const workers = Array.from({ length: argv.concurrency }, () => worker());
  await Promise.all(workers);
  progress.stop();

  if (argv.meta) {
    const metaPath = path.join(outDir, 'thumbnails.json');
    await fs.writeJson(metaPath, meta, { spaces: 2 });
    console.log(`\nMetadata saved to ${metaPath}`);
  }

  async function worker() {
    while (queue.length) {
      const id = queue.shift();
      try {
        await handleId(id);
      } catch (e) {
        console.error(`\n[error] ${id}: ${e.message}`);
      } finally {
        completed += 1;
        progress.update(completed);
      }
    }
  }

  async function handleId(id) {

    const entries = await getThumbnailUrlForIds([id], argv.size, argv.format);
    const entry = entries[0];
    if (!entry || !entry.imageUrl) throw new Error('No thumbnail available');

    const buffer = await downloadToBuffer(entry.imageUrl, argv.retries);
    const processed = await processImage(buffer, { resize: argv.resize, watermark: argv.watermark, wmSize: argv['wm-size'], format: argv.format });

    const filename = `${id}.${argv.format === 'jpg' ? 'jpg' : (argv.format === 'jpeg' ? 'jpg' : 'png')}`;
    const filePath = path.join(outDir, filename);
    await fs.writeFile(filePath, processed);

    meta[id] = {
      id,
      size: argv.size,
      format: argv.format,
      file: path.relative(process.cwd(), filePath),
      source: entry.imageUrl,
      state: entry.state,
      savedAt: new Date().toISOString(),
    };
  }
}

main().catch((e) => {
  console.error('\nFatal:', e);
  process.exit(1);
});

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yargs = require('yargs');
const cliProgress = require('cli-progress');
const sanitize = require('sanitize-filename');

// CLI arguments
const argv = yargs
  .option('ids', { type: 'string', describe: 'Comma-separated Roblox asset IDs' })
  .option('input', { type: 'string', describe: 'Path to text file containing asset IDs' })
  .option('size', { type: 'string', default: '420x420', describe: 'Thumbnail size' })
  .option('format', { type: 'string', default: 'png', describe: 'Thumbnail format' })
  .option('out', { type: 'string', default: 'thumbnails', describe: 'Output folder' })
  .option('template', { type: 'string', default: '{type}/{name}-{id}.{ext}', describe: 'Filename template' })
  .option('flat', { type: 'boolean', default: false, describe: 'Disable folder organization by type' })
  .option('meta', { type: 'boolean', default: false, describe: 'Export metadata JSON file' })
  .option('concurrency', { type: 'number', default: 5, describe: 'Number of simultaneous downloads' })
  .help()
  .argv;

// Load IDs
let ids = [];
if (argv.ids) ids = argv.ids.split(',').map(x => x.trim());
if (argv.input) ids.push(...fs.readFileSync(argv.input, 'utf8').split(/\r?\n/).map(x => x.trim()).filter(Boolean));

if (!ids.length) {
  console.error('No asset IDs provided. Use --ids or --input.');
  process.exit(1);
}

// Helpers
const sleep = ms => new Promise(res => setTimeout(res, ms));

const fetchMetadata = async id => {
  try {
    const { data } = await axios.get(`https://api.roblox.com/marketplace/productinfo?assetId=${id}`);
    return {
      id,
      name: sanitize(data.Name || `Asset_${id}`),
      type: sanitize(data.AssetType || 'Unknown')
    };
  } catch {
    return { id, name: `Asset_${id}`, type: 'Unknown' };
  }
};

const fetchThumbnailUrl = async (id, size, format) => {
  const { data } = await axios.get(`https://thumbnails.roblox.com/v1/assets`, {
    params: { assetIds: id, size, format, isCircular: false }
  });
  return data.data[0]?.imageUrl || null;
};

const buildFilename = (meta, template, flat, format) => {
  const ext = format.toLowerCase();
  const date = new Date().toISOString().split('T')[0];
  let filename = template
    .replace(/{id}/g, meta.id)
    .replace(/{name}/g, meta.name)
    .replace(/{type}/g, meta.type)
    .replace(/{ext}/g, ext)
    .replace(/{date}/g, date);
  if (flat) filename = path.basename(filename);
  return sanitize(filename);
};

const downloadFile = async (url, filepath) => {
  const { data } = await axios.get(url, { responseType: 'arraybuffer' });
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, data);
};

(async () => {
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(ids.length, 0);

  let metadataList = [];
  let queue = [...ids];

  while (queue.length) {
    const batch = queue.splice(0, argv.concurrency);
    await Promise.all(batch.map(async id => {
      try {
        const meta = await fetchMetadata(id);
        const thumbUrl = await fetchThumbnailUrl(id, argv.size, argv.format);
        if (!thumbUrl) throw new Error('No thumbnail found');

        const filename = buildFilename(meta, argv.template, argv.flat, argv.format);
        const outPath = path.join(argv.out, filename);

        await downloadFile(thumbUrl, outPath);

        if (argv.meta) metadataList.push(meta);
      } catch (e) {
        console.error(`Failed for ID ${id}: ${e.message}`);
        queue.push(id);
        await sleep(2000); // backoff before retry
      } finally {
        bar.increment();
      }
    }));
  }

  bar.stop();

  if (argv.meta) {
    fs.writeFileSync(path.join(argv.out, 'metadata.json'), JSON.stringify(metadataList, null, 2));
  }

  console.log('Download complete.');
})();

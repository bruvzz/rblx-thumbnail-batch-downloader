const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');

const ALLOWED_SIZES = ['150x150','420x420','720x720'];
const ALLOWED_FORMATS = ['png','jpg'];

async function fetchThumbnailUrl(assetId, size, format) {
  if (!ALLOWED_SIZES.includes(size)) throw new Error(`Invalid size: ${size}`);
  if (!ALLOWED_FORMATS.includes(format.toLowerCase())) throw new Error(`Invalid format: ${format}`);

  const body = {
    assetIds: [assetId],
    size: size,
    format: format.toLowerCase() === 'jpg' ? 'Jpeg' : 'Png',
    type: 'Asset',
    isCircular: false
  };

  const response = await axios.post('https://thumbnails.roblox.com/v2/assets', body, {
    headers: { 'Content-Type': 'application/json' }
  });

  const data = response.data.data[0];
  if (!data) throw new Error(`No thumbnail data returned for asset ${assetId}`);

  if (data.state !== 'Completed') {
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 500));
      const poll = await axios.post('https://thumbnails.roblox.com/v2/assets', body, {
        headers: { 'Content-Type': 'application/json' }
      });
      const pollData = poll.data.data[0];
      if (pollData && pollData.state === 'Completed') {
        return pollData.imageUrl;
      }
    }
    throw new Error(`Thumbnail not ready for asset ${assetId}`);
  }

  return data.imageUrl;
}

async function downloadThumbnail(url, filepath) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  fs.writeFileSync(filepath, response.data);
  return filepath;
}

async function startDownload(options, onProgress) {
  const ids = options.ids.split(',').map(id => id.trim()).filter(id => /^\d+$/.test(id));
  if (!ids.length) throw new Error("No valid Asset IDs provided.");

  const outFolder = path.join(process.cwd(), 'thumbnails');
  if (!fs.existsSync(outFolder)) fs.mkdirSync(outFolder, { recursive: true });

  const successes = [];
  const failures = [];

  for (const assetId of ids) {
    try {
      const url = await fetchThumbnailUrl(assetId, options.size, options.format);

      const filename = sanitize(
        options.template
          .replace(/{id}/g, assetId)
          .replace(/{type}/g, 'asset')
          .replace(/{name}/g, `asset${assetId}`)
          .replace(/{ext}/g, options.format)
      );

      const filepath = path.join(outFolder, filename);
      await downloadThumbnail(url, filepath);

      successes.push(assetId);
      if (onProgress) onProgress({ assetId, filepath });
    } catch (err) {
      failures.push({ assetId, error: err.message });
      if (onProgress) onProgress({ assetId, error: err.message });
    }
  }

  return { successes, failures };
}

module.exports = { startDownload };

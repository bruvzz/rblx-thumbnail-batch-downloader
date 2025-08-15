# Roblox Thumbnail Batch Downloader

Batch-download thumbnails for Roblox assets using the official thumbnails API.

## Features (v0.1)
- Input IDs via `--ids` (comma-separated) or `--input <file>` (one ID per line)
- Choose sizes: `150x150`, `420x420`, `720x720` (or the closest available)
- PNG/JPEG output
- Output directory control
- Progress bar and retry-on-fail
- Optional resize and text watermark (via `sharp`)
- Optional metadata export (`thumbnails.json`)

> **Note:** In v0.1 we prioritize reliable downloads. Asset name/type lookups will be added in v0.2.

## Install
```bash
npm i
npm link    # optional, to install the CLI globally as `rthumbs`
```

## Usage
```bash
# From a list file
rthumbs --input ids.txt --size 420x420 --format png --out thumbnails

# Direct IDs
rthumbs --ids 123,456,789 --size 720x720 --format jpg

# Resize after download and add a simple text watermark
rthumbs --ids 123 --resize 256 --watermark "My Game" --wm-size 24

# Export metadata
rthumbs --ids 123,456 --meta
```

## Input file format
Plain text with one numeric asset ID per line. Empty lines and comments starting with `#` are ignored.

## Roadmap
- v0.2: Asset name/type detection and type-based folders
- v0.3: Concurrency tuning flags and rate-limit backoff customization
- v0.4: Electron GUI (drag & drop), clipboard capture

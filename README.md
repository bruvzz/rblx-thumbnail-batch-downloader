# Roblox Thumbnail Batch Downloader – Starter Project (v0.3)

## Features
- Bulk downloads Roblox thumbnails given a list of asset IDs.
- Accepts `--ids` or `--input file`.
- Supports sizes like `150x150`, `420x420`, `720x720`.
- Progress bar, retries, output folder control.
- Optional `--resize`, `--watermark`, and `--meta` export.
- Retrieves **asset name** and **type** from Roblox API.
- Organizes downloads into folders by asset type (Models, Decals, Audio, etc.).
- Filenames use `{id}-{name}.{ext}`.
- **NEW:** `--flat` option skips subfolder organization and stores all files in the main output directory.

## Usage
```bash
npm i
npm link  # optional: global command

# Example with type folders
echo 1818 > ids.txt
rthumbs --input ids.txt --size 420x420 --format png --out thumbnails --meta

# Example with flat structure
rthumbs --input ids.txt --size 420x420 --format png --out thumbnails --flat
```

## Next Steps
- Add concurrency control to avoid hitting Roblox rate limits.
- Implement advanced filename templates with placeholders.

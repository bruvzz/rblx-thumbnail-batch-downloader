# Roblox Thumbnail Batch Downloader – Starter Project (v0.5)

## Features
- Bulk downloads Roblox thumbnails given a list of asset IDs.
- Accepts `--ids` or `--input file`.
- Supports sizes like `150x150`, `420x420`, `720x720`.
- Progress bar, retries, output folder control.
- Optional `--resize`, `--watermark`, and `--meta` export.
- Retrieves **asset name** and **type** from Roblox API.
- Organizes downloads into folders by asset type (Models, Decals, Audio, etc.).
- Filenames can be customized with advanced templates using placeholders.
- Placeholders include:
  - `{id}` – asset ID
  - `{name}` – asset name
  - `{type}` – asset type
  - `{ext}` – file extension
  - `{date}` – current date (YYYY-MM-DD)
- `--template` flag allows you to specify filename format (e.g., `--template "{type}/{name}-{id}.{ext}"`).
- `--flat` option skips subfolder organization and stores all files in the main output directory.
- Concurrency control with `--concurrency <number>` to limit simultaneous requests.
- Automatic rate-limit handling with exponential backoff.

## Usage
```bash
npm i
npm link  # optional: global command

# Example with type folders and custom filename template
echo 1818 > ids.txt
rthumbs --input ids.txt --size 420x420 --format png --out thumbnails --template "{type}/{name}-{id}.{ext}" --meta --concurrency 5

# Example with flat structure and date in filename
rthumbs --input ids.txt --size 420x420 --format png --out thumbnails --flat --template "{name}-{date}.{ext}" --concurrency 3
```

## Next Steps
- Add interactive mode for selecting options without command flags.
- Support downloading multiple thumbnail sizes for each asset in one run.

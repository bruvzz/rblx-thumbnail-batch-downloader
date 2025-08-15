# Roblox Thumbnail Batch Downloader

Batch download Roblox thumbnails with advanced filename templates, folder organization, and concurrency control.

## Features
- Bulk download thumbnails by asset IDs (`--ids` or `--input` file)
- Supports sizes like `150x150`, `420x420`, `720x720`
- Optional image resizing and watermarking
- Fetches **asset name** and **type** from Roblox API
- Organizes downloads by asset type (Models, Decals, Audio, etc.)
- Advanced **filename templates** with placeholders: `{id}`, `{name}`, `{type}`, `{ext}`, `{date}`
- `--flat` option to skip folder organization
- Concurrency control with `--concurrency`
- Automatic rate-limit handling and retries
- Optional metadata JSON export (`--meta`)

## Installation
```bash
git clone <your-repo-url>
npm install
npm link  # optional, makes `rthumbs` globally available
```

## Usage
```bash
# Basic usage with a file of IDs
echo 1818 > ids.txt
rthumbs --input ids.txt --size 420x420 --format png --out thumbnails --meta

# Custom filename template and type folders
rthumbs --input ids.txt --size 420x420 --format png --template "{type}/{name}-{id}.{ext}" --out thumbnails

# Flat structure and concurrency limit
rthumbs --input ids.txt --size 420x420 --format png --flat --template "{name}-{date}.{ext}" --concurrency 3
```

## CLI Options
| Option | Description |
|--------|-------------|
| `--ids` | Comma-separated Roblox asset IDs |
| `--input` | Path to a text file containing asset IDs |
| `--size` | Thumbnail size (default: 420x420) |
| `--format` | Thumbnail format: png, jpg, jpeg (default: png) |
| `--out` | Output folder (default: thumbnails) |
| `--template` | Filename template with placeholders |
| `--flat` | Disable type-based folder organization |
| `--meta` | Export metadata JSON |
| `--concurrency` | Number of simultaneous downloads (default: 5) |

## Release Notes (v0.5.0)
- Advanced filename templates: `{id}`, `{name}`, `{type}`, `{ext}`, `{date}`
- `--flat` option to keep all files in the main folder
- Concurrency control and automatic rate-limit handling
- Sanitized filenames to prevent illegal characters

## License
MIT

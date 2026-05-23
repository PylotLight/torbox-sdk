# TorBox SDK

A high-performance, async-first automation tool for TorBox, designed for Bun and Kubernetes environments. This SDK monitors directories for torrent/magnet files, automatically uploads them to TorBox, and downloads the resulting video files directly to a target directory.

## 🚀 Architecture

The SDK uses a decoupled pipeline architecture to ensure reliability and scalability:

- **Watcher**: Monitors specified directories for `.torrent`, `.magnet`, or `.txt` files. It includes debounce logic to prevent duplicate processing during file system operations.
- **TaskQueue**: A concurrency-controlled queue that prevents API rate-limiting and manages async execution.
- **TorrentProcessor**: Handles the upload phase, converting input files into TorBox torrent IDs.
- **DownloadProcessor**: Monitors torrent status until completion and handles the direct download of video files.
- **Providers**: Pluggable API clients for TorBox interaction.

## ✨ Key Features

- **Direct Video Downloads**: Automatically detects and downloads only video files (`.mkv`, `.mp4`, `.avi`, `.mov`), avoiding the need for ZIP archives.
- **Multi-file Support**: Supports full season torrents by identifying and downloading all video files within a single torrent.
- **Automatic Cleanup**: Input files are automatically deleted only after the entire pipeline (upload $\rightarrow$ download) has successfully completed.
- **Production Ready**: 
    - **Graceful Shutdown**: Implements `SIGTERM`/`SIGINT` handling to drain queues before exiting.
    - **Optimized Image**: Multi-stage Docker build using `bun build` to create a minimal, high-performance runtime image.
    - **K8s Optimized**: Low memory footprint and designed for containerized environments.

## 🛠️ Tech Stack
- **Runtime**: [Bun](https://bun.sh) (Ultra-fast JS runtime)
- **Deployment**: Multi-stage Slim Docker image
- **Pattern**: Async Pipeline / State Machine

## ⚙️ Configuration

Environment variables are managed via `src/config/index.ts`:
- `TORBOX_API_KEY`: Your TorBox API token.
- `WATCH_PATHS`: Comma-separated list of directories to monitor for input files.
- `DOWNLOAD_DIR`: Directory where finished video files will be saved.
- `CONCURRENCY`: Number of simultaneous tasks (Default: 3).
- `WATCH_IGNORED`: Files/patterns to ignore.
- `ALLOWED_EXTENSIONS`: Extensions to monitor (e.g., `.torrent`, `.magnet`).

## 🚦 Getting Started

### Installation
```bash
bun install
```

### Running in Dev
```bash
bun run src/index.ts
```

### Docker Build
```bash
docker build -t torbox-sdk .
```

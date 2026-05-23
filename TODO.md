# Future Tasks & Roadmap

## ✅ Completed
- **TorBox API Client**: Fully implemented `client.ts` and `services.ts` for torrent management.
- **Torrent & Download Pipeline**:
    - Implemented `TorrentProcessor` and `DownloadProcessor`.
    - Built a robust `TaskQueue` for concurrent processing.
    - Integrated `Watcher` $\rightarrow$ `TorrentProcessor` $\rightarrow$ `DownloadProcessor` pipeline.
- **Advanced Download Logic**:
    - Support for multi-file torrents (downloads all video files).
    - Automated primary video file detection to avoid ZIPs.
    - Direct CDN link retrieval and streaming to disk.
- **Production Hardening**:
    - Graceful shutdown with `TaskQueue.drain()`.
    - Optimized multi-stage Dockerfile for K8s.
    - Input file cleanup upon successful completion.
    - Watcher debounce and race-condition protection.

## 🛠️ Future Enhancements
- [ ] **Bencode Implementation**: Implement a local `.torrent` parser if TorBox API doesn't provide all required metadata for certain workflows.
- [ ] **Health Checks**: Add a lightweight HTTP server via `Bun.serve` for K8s liveness/readiness probes.
- [ ] **Enhanced Logging**: Move to a structured logging format (JSON) for better integration with ELK/Loki.
- [ ] **Testing Suite**: Implement unit tests for `TaskQueue` and integration tests for the full pipeline.

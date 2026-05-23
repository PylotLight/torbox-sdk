import { loadConfig } from './config';
import { Watcher } from './watcher/Watcher';
import { TaskQueue } from './core/pipeline/TaskQueue';
import { TorrentProcessor } from './core/processor/TorrentProcessor';
import { DownloadProcessor } from './core/processor/DownloadProcessor';
import { TorboxService } from './providers/torbox/services';
import { mkdirSync, unlinkSync } from 'node:fs';
import { log } from './utils/logger';

async function bootstrap() {
  const config = loadConfig();
  log('Bootstrapping TorBox SDK...');

  try {
    mkdirSync(config.DOWNLOAD_DIR, { recursive: true });
    log(`Download directory ensured at: ${config.DOWNLOAD_DIR}`);
  } catch (e) {
    log(`Could not create download directory: ${e}`, 'error');
  }

  const torboxService = new TorboxService({
    apiKey: process.env.TORBOX_API_KEY || 'missing_key',
    baseUrl: 'https://api.torbox.app',
  });

  const addQueue = new TaskQueue(new TorrentProcessor(torboxService), config.CONCURRENCY);
  const downloadQueue = new TaskQueue(new DownloadProcessor(torboxService), config.CONCURRENCY);

  const watcher = new Watcher({
    paths: config.WATCH_PATHS,
    recursive: true,
    ignored: config.WATCH_IGNORED,
    allowedExtensions: config.ALLOWED_EXTENSIONS,
  });

  const processingFiles = new Set<string>();

  watcher.on('add', async (filePath: string) => {
    if (processingFiles.has(filePath)) return;
    processingFiles.add(filePath);

    log(`New file detected: ${filePath}. Queueing for upload...`);
    
    try {
      const addResult = await addQueue.enqueue({ filePath });
      log(`Successfully added torrent ${addResult.torrentId}. Queueing for download...`);
      
      await downloadQueue.enqueue({ 
        torrentId: addResult.torrentId 
      });
      log(`Torrent ${addResult.torrentId} downloaded successfully.`);
      
      try {
        unlinkSync(filePath);
        log(`Successfully removed input file: ${filePath}`, 'info');
      } catch (e) {
        if ((e as any).code !== 'ENOENT') {
          log(`Could not remove input file ${filePath}: ${e}`, 'warn');
        }
      }
    } catch (err) {
      log(`Pipeline failed for ${filePath}: ${err}`, 'error');
    } finally {
      // Delay clearing from processingFiles to prevent the watcher from 
      // immediately picking up the file while it is being deleted.
      setTimeout(() => {
        processingFiles.delete(filePath);
      }, 1000);
    }
  });

  const shutdown = async () => {
    log('Shutdown signal received. Cleaning up...', 'warn');
    
    watcher.stop();
    
    try {
      await Promise.all([
        addQueue.drain(),
        downloadQueue.drain()
      ]);
      log('All tasks drained successfully.');
    } catch (e) {
      log(`Error during drain: ${e}`, 'warn');
    }
    
    log('Exiting process.');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await watcher.start();
  log(`Running. Watching paths: ${config.WATCH_PATHS.join(', ')}`);
}

bootstrap().catch(err => {
  log(`Fatal Error during bootstrap: ${err}`, 'error');
  process.exit(1);
});

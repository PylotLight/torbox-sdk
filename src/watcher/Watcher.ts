import { EventEmitter } from 'node:events';
import { watch, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface WatcherOptions {
  paths: string[];
  recursive?: boolean;
  ignored?: string[];
  allowedExtensions?: string[];
}

export class Watcher extends EventEmitter {
  private watchers: Map<string, any> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private options: WatcherOptions) {
    super();
  }

  async start() {
    console.log(`[Watcher] Starting watcher on paths: ${this.options.paths.join(', ')}`);
    
    for (const path of this.options.paths) {
      await this.scanDirectory(path);
    }

    for (const path of this.options.paths) {
      try {
        const watcher = watch(path, { recursive: this.options.recursive }, (eventType, filename) => {
          if (!filename) return;
          
          const fullPath = join(path, filename);
          if (this.isIgnored(fullPath)) return;

          this.handleEvent(eventType, fullPath);
        });
        
        this.watchers.set(path, watcher);
      } catch (error) {
        console.error(`[Watcher] Failed to watch path ${path}:`, error);
      }
    }
  }

  private async scanDirectory(dirPath: string) {
    try {
      const files = readdirSync(dirPath);
      for (const file of files) {
        const fullPath = join(dirPath, file);
        const stats = statSync(fullPath);

        if (stats.isDirectory()) {
          if (this.options.recursive) {
            await this.scanDirectory(fullPath);
          }
        } else {
          if (!this.isIgnored(fullPath)) {
            this.emit('add', fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`[Watcher] Scan failed for ${dirPath}:`, error);
    }
  }

  private handleEvent(eventType: string, filePath: string) {
    if (eventType !== 'rename') return;

    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath));
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      
      // Added a small delay and double-check to ensure the file is stable
      if (existsSync(filePath)) {
        this.emit('add', filePath);
      }
    }, 500); // Increased debounce to 500ms to let FS operations settle

    this.debounceTimers.set(filePath, timer);
  }

  isIgnored(filePath: string): boolean {
    if ((this.options.ignored || []).some(pattern => filePath.includes(pattern))) {
      return true;
    }

    if (this.options.allowedExtensions && this.options.allowedExtensions.length > 0) {
      const hasAllowedExt = this.options.allowedExtensions.some(ext => filePath.endsWith(ext));
      if (!hasAllowedExt) return true;
    }

    return false;
  }

  stop() {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
    
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    
    console.log('[Watcher] Stopped');
  }
}

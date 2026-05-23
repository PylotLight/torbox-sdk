import { BaseProcessor } from './BaseProcessor';
import { TorboxService } from '../../providers/torbox/services';
import { ProcessorResult } from '../types';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';

export interface DownloadTaskPayload {
  torrentId: string;
  fileId?: string;
}

export interface DownloadProcessResult {
  downloadUrls?: string[];
  status: string;
}

export class DownloadProcessor extends BaseProcessor<DownloadTaskPayload, DownloadProcessResult> {
  protected readonly processorName = 'DownloadProcessor';

  constructor(private torboxService: TorboxService) {
    super();
  }

  async execute(payload: DownloadTaskPayload): Promise<DownloadProcessResult> {
    const { torrentId, fileId } = payload;
    const config = loadConfig();

    let isCompleted = false;
    let attempts = 0;
    const maxAttempts = 100;
    let targetFiles: any[] = [];

    while (!isCompleted && attempts < maxAttempts) {
      const statusRes = await this.torboxService.getStatus(torrentId);
      
      if (statusRes.success && statusRes.result) {
        const torrent = statusRes.result.data || statusRes.result;
        
        const state = torrent.download_state;
        const finished = torrent.download_finished;
        const isCached = torrent.cached;
        
        if (finished === true || state === 'completed' || isCached === true) {
          isCompleted = true;
          
          if (torrent.files) {
            if (fileId !== undefined) {
              const specificFile = torrent.files.find(f => f.id === fileId);
              targetFiles = specificFile ? [specificFile] : [];
            } else {
              targetFiles = this.filterVideoFiles(torrent.files);
            }
          }
        } else {
          attempts++;
          const progressPercent = (torrent.progress || 0) * 100;
          const stateLabel = state || (progressPercent === 0 ? 'Initializing' : 'Downloading');
          log(`Torrent ${torrentId} is ${stateLabel} (Progress: ${progressPercent.toFixed(1)}%, Attempt ${attempts}/${maxAttempts}). Waiting...`, 'info');
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      } else {
        attempts++;
        log(`Failed to fetch status for torrent ${torrentId} (Attempt ${attempts}/${maxAttempts}).`, 'warn');
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }

    if (!isCompleted) {
      throw new Error(`Torrent ${torrentId} did not reach finished/cached state within time limit.`);
    }

    if (targetFiles.length === 0) {
      throw new Error(`No suitable files found for download in torrent ${torrentId}.`);
    }

    const downloadUrls: string[] = [];

    for (const file of targetFiles) {
      const dlRes = await this.torboxService.requestDownload({
        torrentId,
        fileId: file.id,
      });

      if (!dlRes.success) {
        log(`Failed to get link for file ${file.short_name || file.id}: ${JSON.stringify(dlRes.error)}`, 'warn');
        continue;
      }

      let url: string | undefined;
      if (typeof dlRes.result === 'string') {
        url = dlRes.result;
      } else if (dlRes.result && typeof dlRes.result === 'object') {
        url = dlRes.result.data || dlRes.result.download_link;
      }

      if (!url) {
        log(`No download URL returned for file ${file.short_name || file.id}`, 'warn');
        continue;
      }

      await this.downloadFile(url, file.short_name || `file_${file.id}.mkv`);
      downloadUrls.push(url);
    }

    if (downloadUrls.length === 0) {
      throw new Error(`Failed to download any files from torrent ${torrentId}.`);
    }

    return {
      downloadUrls,
      status: 'downloaded',
    };
  }

  private filterVideoFiles(files: any[]): any[] {
    if (!files || !Array.isArray(files)) return [];

    const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov'];
    return files.filter(file => {
      const name = (file.name || '').toLowerCase();
      return videoExtensions.some(ext => name.endsWith(ext));
    });
  }

  private async downloadFile(url: string, fileName: string) {
    const config = loadConfig();
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

    const path = `${config.DOWNLOAD_DIR}/${fileName}`;
    
    log(`Downloading file: ${fileName}`, 'info');
    
    const reader = response.body;
    if (!reader) throw new Error('Response body is null');

    const fileHandle = Bun.file(path);
    const writer = fileHandle.writer();
    
    for await (const chunk of reader) {
      writer.write(chunk);
    }
    
    writer.end();
    log(`Successfully saved: ${fileName}`, 'info');
  }
}

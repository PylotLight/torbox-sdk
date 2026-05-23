import { BaseProcessor } from './BaseProcessor';
import { TorboxService } from '../../providers/torbox/services';
import { unlinkSync, existsSync } from 'node:fs';
import { log } from '../../utils/logger';

export interface TorrentTaskPayload {
  filePath: string;
}

export interface TorrentProcessResult {
  torrentId: string;
  status: string;
  filePath: string;
}

export class TorrentProcessor extends BaseProcessor<TorrentTaskPayload, TorrentProcessResult> {
  protected readonly processorName = 'TorrentProcessor';

  constructor(private torboxService: TorboxService) {
    super();
  }

  async execute(payload: TorrentTaskPayload): Promise<TorrentProcessResult> {
    const { filePath } = payload;

    if (!existsSync(filePath)) {
      throw new Error(`File no longer exists: ${filePath}`);
    }

    const isTorrentFile = filePath.endsWith('.torrent');
    const isMagnetFile = filePath.endsWith('.magnet') || filePath.endsWith('.txt');

    if (!isTorrentFile && !isMagnetFile) {
      log(`Invalid file type detected: ${filePath}. Deleting...`, 'warn');
      try {
        unlinkSync(filePath);
      } catch (e) {
        log(`Failed to delete invalid file ${filePath}: ${e}`, 'error');
      }
      throw new Error(`Invalid file type: ${filePath}`);
    }

    let options: Parameters<TorboxService['addTorrent']>[0];

    if (isTorrentFile) {
      const file = Bun.file(filePath);
      options = {
        file: file,
        name: filePath.split('/').pop(),
      };
    } else {
      let magnet = '';
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        magnet = await Bun.file(filePath).text();
        if (magnet.trim()) break;
        
        attempts++;
        if (attempts < maxAttempts) {
          log(`Magnet file ${filePath} is empty. Retrying in 500ms... (Attempt ${attempts}/${maxAttempts})`, 'warn');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const trimmedMagnet = magnet.trim();
      if (!trimmedMagnet) {
        throw new Error(`Magnet file ${filePath} is empty after ${maxAttempts} attempts`);
      }
      
      options = {
        magnet: trimmedMagnet,
      };
    }

    const response = await this.torboxService.addTorrent(options);

    if (!response.success) {
      throw response.error instanceof Error 
        ? response.error 
        : new Error(`TorBox API failed to add torrent: ${JSON.stringify(response.error)}`);
    }

    const resultData = response.result?.data || response.result;
    const torrentId = resultData?.id || resultData?.torrent_id;
    
    if (!torrentId) {
      throw new Error(`API returned success but no torrent ID was found in response: ${JSON.stringify(response.result)}`);
    }

    return {
      torrentId: String(torrentId),
      status: 'added',
      filePath: filePath,
    };
  }
}

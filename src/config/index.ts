export interface Config {
  WATCH_PATHS: string[];
  WATCH_IGNORED: string[];
  ALLOWED_EXTENSIONS: string[];
  CONCURRENCY: number;
  NODE_ENV: 'development' | 'production' | 'test';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  DOWNLOAD_DIR: string;
}

export const loadConfig = (): Config => {
  return {
    WATCH_PATHS: process.env.WATCH_PATHS?.split(',') || ['./watch'],
    WATCH_IGNORED: process.env.WATCH_IGNORED?.split(',') || ['.tmp', '.DS_Store'],
    ALLOWED_EXTENSIONS: process.env.ALLOWED_EXTENSIONS?.split(',') || ['.torrent', '.magnet'],
    CONCURRENCY: parseInt(process.env.CONCURRENCY || '3', 10),
    NODE_ENV: (process.env.NODE_ENV as Config['NODE_ENV']) || 'development',
    LOG_LEVEL: (process.env.LOG_LEVEL as Config['LOG_LEVEL']) || 'info',
    DOWNLOAD_DIR: process.env.DOWNLOAD_DIR || './downloads',
  };
};

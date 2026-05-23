export const log = (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
  const now = new Date().toISOString();
  const timestamp = `[${now}]`;
  
  switch (level) {
    case 'warn':
      console.warn(`${timestamp} ⚠️  ${message}`);
      break;
    case 'error':
      console.error(`${timestamp} ❌ ${message}`);
      break;
    default:
      console.log(`${timestamp} ℹ️  ${message}`);
  }
};

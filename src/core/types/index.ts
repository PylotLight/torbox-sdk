export enum ProcessorStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface ProcessTask<T = any> {
  id: string;
  payload: T;
  status: ProcessorStatus;
  createdAt: Date;
  updatedAt: Date;
  error?: Error;
}

export interface ProcessorResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
}

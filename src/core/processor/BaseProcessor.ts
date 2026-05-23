import { type ProcessTask, ProcessorStatus, type ProcessorResult } from '../types';
import { log } from '../../utils/logger';

export abstract class BaseProcessor<TInput, TOutput> {
  protected abstract readonly processorName: string;

  async process(task: ProcessTask<TInput>): Promise<ProcessorResult<TOutput>> {
    try {
      this.updateStatus(task, ProcessorStatus.PROCESSING);
      
      const result = await this.execute(task.payload);
      
      this.updateStatus(task, ProcessorStatus.COMPLETED);
      return { success: true, data: result };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.updateStatus(task, ProcessorStatus.FAILED, err);
      return { success: false, error: err };
    }
  }

  protected abstract execute(payload: TInput): Promise<TOutput>;

  protected updateStatus(task: ProcessTask<TInput>, status: ProcessorStatus, error?: Error) {
    task.status = status;
    task.updatedAt = new Date();
    if (error) task.error = error;
    
    const message = `[${this.processorName}] Task ${task.id} -> ${status}${error ? ` (Error: ${error.message})` : ''}`;
    if (status === ProcessorStatus.FAILED) {
      log(message, 'error');
    } else {
      log(message, 'info');
    }
  }
}

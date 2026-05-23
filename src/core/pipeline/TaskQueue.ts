import { ProcessTask, ProcessorStatus } from '../types';
import { BaseProcessor } from '../processor/BaseProcessor';

export class TaskQueue<TInput, TOutput> {
  private queue: ProcessTask<TInput>[] = [];
  private activeCount = 0;
  private isPaused = false;
  private resolvers = new Map<string, { resolve: (val: TOutput) => void, reject: (err: any) => void }>();
  private activePromises = new Set<Promise<any>>();

  constructor(
    private processor: BaseProcessor<TInput, TOutput>,
    private concurrency = 3
  ) {}

  async enqueue(payload: TInput): Promise<TOutput> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const task: ProcessTask<TInput> = {
        id,
        payload,
        status: ProcessorStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.resolvers.set(id, { resolve, reject });
      this.queue.push(task);
      this.processNext();
    });
  }

  private async processNext() {
    if (this.isPaused || this.activeCount >= this.concurrency) {
      return;
    }

    const task = this.queue.find(t => t.status === ProcessorStatus.PENDING);
    if (!task) return;

    this.activeCount++;
    const resolver = this.resolvers.get(task.id);

    const execution = (async () => {
      try {
        const result = await this.processor.process(task);
        if (resolver) {
          if (result.success) resolver.resolve(result.data!);
          else resolver.reject(result.error);
        }
      } catch (err) {
        if (resolver) resolver.reject(err);
      } finally {
        this.activeCount--;
        if (resolver) this.resolvers.delete(task.id);
        this.processNext();
      }
    })();

    this.activePromises.add(execution);
    execution.finally(() => this.activePromises.delete(execution));

    this.processNext();
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    this.processNext();
  }

  async drain() {
    this.isPaused = true; // Stop picking up new tasks immediately
    if (this.activePromises.size === 0) return;
    
    // We wait for active tasks to finish, but we don't want to hang forever
    // especially if a processor is stuck in a long loop (like the 60s poll).
    await Promise.race([
      Promise.all(Array.from(this.activePromises)),
      new Promise(resolve => setTimeout(resolve, 5000)) // Max 5s wait for drain
    ]);
  }

  getStats() {
    return {
      pending: this.queue.filter(t => t.status === ProcessorStatus.PENDING).length,
      processing: this.activeCount,
      completed: this.queue.filter(t => t.status === ProcessorStatus.COMPLETED).length,
      failed: this.queue.filter(t => t.status === ProcessorStatus.FAILED).length,
    };
  }
}

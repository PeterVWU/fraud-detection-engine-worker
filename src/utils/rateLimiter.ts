// src/utils/rateLimiter.ts
export class RateLimiter {
    private queue: Array<() => Promise<any>> = [];
    private processing = false;

    constructor(
        private requestsPerSecond: number,
        private maxConcurrent: number = 1
    ) { }

    async add<T>(task: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await task();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });

            if (!this.processing) {
                this.processQueue();
            }
        });
    }

    private async processQueue() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        const delay = 1000 / this.requestsPerSecond;

        while (this.queue.length > 0) {
            const tasks = this.queue.splice(0, this.maxConcurrent);
            await Promise.all(tasks.map(task => task()));
            if (this.queue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        this.processing = false;
    }
}
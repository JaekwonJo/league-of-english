class OpenAIQueue {
  constructor(getClient) {
    this.getClient = typeof getClient === 'function' ? getClient : () => null;
    this.queue = [];
    this.processing = false;
  }

  enqueue(task, options = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, options, resolve, reject });
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;
    while (this.queue.length) {
      const { task, options, resolve, reject } = this.queue.shift();
      try {
        const result = await this.runWithRetry(task, options);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
    this.processing = false;
  }

  async runWithRetry(task, options = {}) {
    const retries = Number.isInteger(options.retries) ? options.retries : 3;
    const baseDelay = Number.isFinite(options.baseDelay) ? options.baseDelay : 500;
    const maxDelay = Number.isFinite(options.maxDelay) ? options.maxDelay : 4000;
    let attempt = 0;

    while (true) {
      try {
        const client = this.getClient();
        if (!client) {
          throw new Error('AI generator unavailable');
        }
        return task.length > 0 ? await task(client) : await task();
      } catch (error) {
        attempt += 1;
        if (attempt > retries) {
          throw error;
        }
        const delay = Math.min(baseDelay * (2 ** (attempt - 1)), maxDelay);
        await this.delay(delay);
      }
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
  }

  callChatCompletion(config, options = {}) {
    return this.enqueue((client) => client.chat.completions.create(config), options);
  }
}

module.exports = OpenAIQueue;

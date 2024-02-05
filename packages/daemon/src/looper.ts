export interface LooperOptions {
  sleep: number
}

export class Looper {
  private readonly options: LooperOptions
  private readonly method: () => void | Promise<void>

  constructor (method: () => void | Promise<void>, options: Partial<LooperOptions> = {}) {
    this.options = {
      sleep: options.sleep ?? 60000
    }

    this.method = method
  }

  async run (options: Partial<{ signal: AbortSignal }> = {}): Promise<void> {
    for (;;) {
      if (options.signal?.aborted == null) {
        return
      }

      await this.method()
      await new Promise<void>((resolve, reject) => {
        options.signal?.addEventListener('abort', reject, { once: true })

        setTimeout(() => {
          options.signal?.removeEventListener('abort', reject)
          resolve()
        }, this.options.sleep)
      })
    }
  }
}

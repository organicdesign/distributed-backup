import { DeferredPromise } from '@open-draft/deferred-promise'
import { CID } from 'multiformats/cid'
import type { BlockRetriever } from '@helia/interface'
import type { AbortOptions } from 'interface-store'

export class ManualBlockBroker implements BlockRetriever {
  private readonly promises = new Map<string, DeferredPromise<Uint8Array>>()

  async retrieve (cid: CID, { signal }: AbortOptions): Promise<Uint8Array> {
    const existing = this.promises.get(cid.toString())

    if (existing != null) {
      return existing
    }

    const promise = new DeferredPromise<Uint8Array>()

    signal?.addEventListener('abort', () => {
      promise.reject('operation aborted')
    })

    this.promises.set(cid.toString(), promise)

    return promise
  }

  provide (cid: CID, block: Uint8Array): boolean {
    const promise = this.promises.get(cid.toString())

    if (promise != null) {
      promise.resolve(block)
      return true
    }

    return false
  }

  * getWants (): Generator<CID> {
    for (const key of this.promises.keys()) {
      yield CID.parse(key)
    }
  }
}

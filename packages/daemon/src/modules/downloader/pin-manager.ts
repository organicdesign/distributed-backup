import { Key, type Pair, type Datastore } from 'interface-datastore'
import all from 'it-all'
import * as logger from 'logger'
import { CID } from 'multiformats/cid'
import type { PinManager as HeliaPinManager, BlockInfo } from 'helia-pin-manager'

export class PinManager {
  private readonly datastore: Datastore
  private readonly pinManager: HeliaPinManager

  constructor (components: { datastore: Datastore, pinManager: HeliaPinManager }) {
    this.datastore = components.datastore
    this.pinManager = components.pinManager
  }

  async has (key: string, cid?: CID): Promise<boolean> {
    const eCid = await this.getByKey(key)

    if (eCid == null) {
      return false
    }

		if (cid == null) {
			return true;
		}

    return eCid.equals(cid)
  }

  async * getActive (): AsyncGenerator<{
    cid: CID
    key: string
  }> {
    for (const pin of await this.pinManager.getActiveDownloads()) {
      for await (const { key } of this.getByPin(pin)) {
        yield {
          cid: pin,
          key: key.toString()
        }
      }
    }
  }

  async download (pin: CID, options?: { limit: number }): Promise<Array<() => Promise<BlockInfo>>> {
    return this.pinManager.downloadSync(pin, options)
  }

  async getState (cid: CID): Promise<'COMPLETED' | 'DOWNLOADING' | 'DESTROYED' | 'UPLOADING' | 'NOTFOUND'> {
    return this.pinManager.getState(cid)
  }

  async getSize (cid: CID): Promise<number> {
    return this.pinManager.getSize(cid)
  }

  async getBlockCount (cid: CID): Promise<number> {
    return this.pinManager.getBlockCount(cid)
  }

  async remove (key: string): Promise<void> {
		const cid = await this.getByKey(key);

		if (cid == null) {
			return;
		}

    const keys = await all(this.getByPin(cid))

		// If we only have 1 reference be sure to unpin it.
    if (keys.length <= 1) {
      await this.pinManager.unpin(cid)
    }

    logger.references(`[-] ${key.toString()}`)

    await this.datastore.delete(new Key(key))
  }

	private async getByKey (key: string): Promise<CID | null> {
		try {
			const data = await this.datastore.get(new Key(key));

			return CID.decode(data);
		} catch (error) {
			return null
		}
	}

  private async * getByPin (pin: CID): AsyncGenerator<Pair, void, undefined> {
    yield * this.datastore.query({
      filters: [({ value }) => {
        const cid = CID.decode(value)

        return cid.equals(pin)
      }]
    })
  }
}

import type { BlockRetriever } from '@helia/interface'
import type { CID } from 'multiformats/cid'

export class ManualBlockBroker implements BlockRetriever {
	async retrieve (cid: CID): Promise<Uint8Array> {
		return new Uint8Array()
	}
}

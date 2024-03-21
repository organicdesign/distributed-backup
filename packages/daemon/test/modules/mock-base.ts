import { KeyManager, parseKeyData } from '@organicdesign/db-key-manager'
import { MemoryBlockstore } from 'blockstore-core'
import { MemoryDatastore } from 'datastore-core'
import type { Provides } from '../../src/modules/base/index.js'

const provs = (): Provides => {
  return {
    keyManager: new KeyManager(parseKeyData({
      key: '5TP9VimJU1WdSoTxZGLhSuPKqCpXirPHDK4ZjHxzetex-8zAV14C4oLe4dytUSVzznTuQ659pY1dSMG8HAQenDqVQ',
      psk: '/key/swarm/psk/1.0.0/\n/base16/\n56d3c18282f1f1b1b3e04e40dd5d8bf44cafa8bc9c9bc7c57716a7766fa2c550'
    })),
    datastore: new MemoryDatastore(),
    blockstore: new MemoryBlockstore()
  }
}

export default provs

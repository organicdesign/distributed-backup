// import importEncryptedFunc from './import-encrypted.js'
// import importPlaintextFunc from './import-plaintext.js'
import importRecursiveFunc from './import-recursive.js'
import selectChunkerFunc from './select-chunker.js'
import selectHasherFunc from './select-hasher.js'

export type * from './interfaces.js'

export const selectHasher = selectHasherFunc
export const selectChunker = selectChunkerFunc
// No longer want to support these methods, keeping them here for reference.
// export const importPlaintext = importPlaintextFunc
// export const importEncrypted = importEncryptedFunc
export const importer = importRecursiveFunc

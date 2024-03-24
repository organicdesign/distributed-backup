import {
  type KeyData,
  parseKeyData,
  generateKeyData,
  generateMnemonic
} from '@organicdesign/db-key-manager'

export const generateKey = async (): Promise<KeyData> => {
  const mnemonic = generateMnemonic()
  const name = generateMnemonic().split(' ')[0]
  const rawKeyData = await generateKeyData(mnemonic, name)

  return parseKeyData(rawKeyData)
}

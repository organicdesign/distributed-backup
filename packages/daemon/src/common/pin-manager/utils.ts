import * as cborg from 'cborg'
import { CID } from 'multiformats/cid'
import { EncodedPinInfo, type PinInfo } from './interface.js'

export const decodePinInfo = (data: Uint8Array): PinInfo | null => {
  const obj = cborg.decode(data)

  if (obj == null) {
    return null
  }

  const encodedPinInfo = EncodedPinInfo.parse(obj)

  return {
    ...encodedPinInfo,
    cid: CID.decode(encodedPinInfo.cid)
  }
}

export const encodePinInfo = (pinInfo: PinInfo): Uint8Array => {
  const encodedPinInfo: EncodedPinInfo = {
    ...pinInfo,
    cid: pinInfo.cid.bytes,
    paused: pinInfo.paused ?? false
  }

  // This will strip foreign keys.
  const parsedEncodedPinInfo = EncodedPinInfo.parse(encodedPinInfo)

  return cborg.encode(parsedEncodedPinInfo)
}

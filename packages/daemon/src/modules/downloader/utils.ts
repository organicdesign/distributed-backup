import { EncodedPinInfo, type PinInfo } from './interface.js'
import { decodeAny, encodeAny } from '@/utils.js'
import { CID } from "multiformats/cid"

export const linearWeightTranslation = (p: number): number => {
  return 1 - p
}

export const logWeightTranslation = (p: number): number => {
  return 1 - Math.log10((10 - 1) * p - 1)
}

export const decodePinInfo = (data: Uint8Array): PinInfo | null => {
	const obj = decodeAny(data)

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
		cid: pinInfo.cid.bytes
	};

	// This will strip foreign keys.
	const parsedEncodedPinInfo = EncodedPinInfo.parse(encodedPinInfo)

	return encodeAny(parsedEncodedPinInfo)
}

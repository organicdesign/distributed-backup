export interface Components {
	aesKey: Uint8Array,
	hmacKey: Uint8Array
}

export interface EncryptionParams {
	salt: Uint8Array
	iv: Uint8Array
}

import assert from 'assert/strict'
import * as cborg from 'cborg'

describe('cbor encoding and decoding', () => {
  const data = [
    {
      decoded: new Uint8Array([0, 1, 2, 3]),
      encoded: new Uint8Array([68, 0, 1, 2, 3])
    },

    {
      decoded: 'str',
      encoded: new Uint8Array([99, 115, 116, 114])
    },

    {
      decoded: 9999,
      encoded: new Uint8Array([25, 39, 15])
    },

    {
      decoded: [{ test: 'value' }],
      encoded: new Uint8Array([129, 161, 100, 116, 101, 115, 116, 101, 118, 97, 108, 117, 101])
    }
  ]

  it('encodes any data', () => {
    for (const { encoded, decoded } of data) {
      assert.deepEqual(encoded, cborg.encode(decoded))
    }
  })

  it('decodes any data', () => {
    for (const { encoded, decoded } of data) {
      assert.deepEqual(cborg.decode(encoded), decoded)
    }
  })
})

import assert from 'assert/strict'
import { handler } from '../src/commands/addresses.js'

const mockArgs = {
	json: false,
	socket: 'mockSocket',
	_: [],
	"$0": ''
}

describe('addresses', () => {
	it('text', async () => {
		const addresses = ['address-abc', 'address-def', 'address-ghi']
		const client = { addresses: () => addresses }
		// @ts-ignore
		const response = await handler({ ...mockArgs, client })

		assert.equal(response, addresses.join('\n'));
	})

	it('json', async () => {
		const addresses = ['address-abc', 'address-def', 'address-ghi']
		const client = { addresses: () => addresses }
		// @ts-ignore
		const response = await handler({ ...mockArgs, client, json: true })

		assert.deepEqual(response, JSON.stringify(addresses));
	})
})

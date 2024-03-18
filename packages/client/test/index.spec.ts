// import assert from 'assert/strict'
import { createServer } from 'net'
import Path from 'path'
import { fileURLToPath } from 'url'
import { Client } from '../src/index.js'

const socket = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../server.socket')

describe('client', () => {
  const server = createServer()

  before(async () => {
    await new Promise<void>(resolve => server.listen(socket, resolve))
  })

  after(async () => {
    await new Promise(resolve => server.close(resolve))
  })

  it('connects and disconnects to a server', () => {
    const client = new Client(socket)

    client.stop()
  })
})

import assert from 'assert/strict'
import { MemoryDatastore } from 'datastore-core'
import { Key } from 'interface-datastore'
import all from 'it-all'
import { fromString } from 'uint8arrays/from-string'
import { NamespaceDatastore } from '../src/index.js'

const pairs = [
  'abc',
  '123',
  'abcdef',
  '23456789'
].map(s => ({ key: new Key(s), value: fromString(s) }))

describe('namespace-datastore', () => {
  it('queries an extended datastore', async () => {
    const parent = new MemoryDatastore()
    const child = new NamespaceDatastore(parent, new Key('child'))

    await all(child.putMany(pairs))

    const out = await all(child.query({}))

    assert.deepEqual(out, pairs)
  })

  it('does not query the sybling of an extended datastore', async () => {
    const parent = new MemoryDatastore()
    const child = new NamespaceDatastore(parent, new Key('child'))
    const sybling = new NamespaceDatastore(parent, new Key('sybling'))

    await all(sybling.putMany(pairs))

    const out = await all(child.query({}))

    assert.deepEqual(out, [])
  })

  it('does not query the parent of an extended datastore', async () => {
    const parent = new MemoryDatastore()
    const child = new NamespaceDatastore(parent, new Key('child'))

    await all(parent.putMany(pairs))

    const out = await all(child.query({}))

    assert.deepEqual(out, [])
  })

  it('queries a granchild extended datastore', async () => {
    const parent = new MemoryDatastore()
    const child = new NamespaceDatastore(parent, new Key('child'))
    const grandchild = new NamespaceDatastore(child, new Key('grandchild'))

    await all(grandchild.putMany(pairs))

    const out = await all(grandchild.query({}))

    assert.deepEqual(out, pairs)
  })
})

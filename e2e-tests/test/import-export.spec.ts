import assert from 'assert/strict'
import { exec as execCb } from 'child_process'
import fs from 'fs/promises'
import Path from 'path'
import { promisify } from 'util'
import projectPath from './utils/project-path.js'
import runClient from './utils/run-client.js'
import runNode from './utils/run-node.js'

const exec = promisify(execCb)

const node = 'import-export'
const testDataDir = Path.join(projectPath, 'e2e-tests/test-data')

const data = [
  {
    import: Path.join(testDataDir, 'file-1.txt'),
    export: Path.join(projectPath, 'e2e-tests/file-1.txt'),
    virtual: '/file-1.txt'
  },
  {
    import: testDataDir,
    export: Path.join(projectPath, 'e2e-tests/parent'),
    virtual: '/parent'
  },
  {
    import: Path.join(testDataDir, 'dir-1'),
    export: Path.join(projectPath, 'e2e-tests/subdir'),
    virtual: '/subdir'
  }
] as const

describe('import/export', () => {
  let proc: Awaited<ReturnType<typeof runNode>>
  let group: string

  before(async () => {
    proc = await runNode(node)

    await proc.start()

    group = (await runClient(node, 'create-group', 'test')).group

    await Promise.allSettled(data.map(async d => fs.rm(d.export, { recursive: true })))
  })

  after(async () => {
    await proc.stop()
    await Promise.allSettled(data.map(async d => fs.rm(d.export, { recursive: true })))
  })

  it('imports a file', async () => {
    const response = await runClient(node, 'add', group, data[0].import, data[0].virtual)

    assert.deepEqual(response, {
      success: true,
      imports: [
        {
          cid: 'bafybeihoqexapn3tusc4rrkqztzzemz7y57esnzg7eutsua4ehjkylmjqe',
          path: data[0].virtual
        }
      ]
    })
  })

  it('imports a directory', async () => {
    const response = await runClient(node, 'add', group, data[1].import, data[1].virtual)

    const expectedImports = [
      {
        cid: 'bafybeihoqexapn3tusc4rrkqztzzemz7y57esnzg7eutsua4ehjkylmjqe',
        path: Path.join(data[1].virtual, 'file-1.txt')
      },
      {
        cid: 'bafybeibac7pp5mcxkj7s55bjdbr7tj3pj7col4janvm36y4fjvxqs67fsi',
        path: Path.join(data[1].virtual, 'file-2.txt')
      },
      {
        cid: 'bafybeihxa6uyvmdl6wdjxnwpluocix2csrq3ifunemjr2jxy35wjkl2v64',
        path: Path.join(data[1].virtual, 'dir-1/file-3.txt')
      }
    ]

    response.imports.sort((a: { path: string }, b: { path: string }) => a.path.localeCompare(b.path))
    expectedImports.sort((a, b) => a.path.localeCompare(b.path))

    assert.deepEqual(response, {
      success: true,
      imports: expectedImports
    })
  })

  it('imports a sub directory', async () => {
    const response = await runClient(node, 'add', group, data[2].import, data[2].virtual)

    assert.deepEqual(response, {
      success: true,
      imports: [
        {
          cid: 'bafybeihxa6uyvmdl6wdjxnwpluocix2csrq3ifunemjr2jxy35wjkl2v64',
          path: Path.join(data[2].virtual, 'file-3.txt')
        }
      ]
    })
  })

  it('exports a file', async () => {
    const response = await runClient(node, 'export', group, data[0].virtual, data[0].export)

    assert.deepEqual(response, {
      success: true
    })

    const { stdout: hash1 } = await exec(`sha256sum ${data[0].import} | head -c 64`)
    const { stdout: hash2 } = await exec(`sha256sum ${data[0].export} | head -c 64`)

    assert.equal(hash1, hash2)
  })

  it('exports a directory', async () => {
    const response = await runClient(node, 'export', group, data[1].virtual, data[1].export)

    assert.deepEqual(response, {
      success: true
    })

    const { stdout: hash1 } = await exec(`find ${data[1].import} -type f -exec cat {} \\; | shasum -`)
    const { stdout: hash2 } = await exec(`find ${data[1].export} -type f -exec cat {} \\; | shasum -`)

    assert.equal(hash1, hash2)
  })
})

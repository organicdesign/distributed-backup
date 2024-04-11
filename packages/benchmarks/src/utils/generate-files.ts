import crypto from 'crypto'
import fss from 'fs'
import fs from 'fs/promises'
import Path from 'path'
import prettyBytes from 'pretty-bytes'

export const generateFile = async (path: string, size: number, options?: { chunkSize: number }): Promise<void> => {
  const chunkSize = options?.chunkSize ?? 2 ** 14
  const stream = fss.createWriteStream(path)

  for (let i = 0; i < Math.ceil(size / chunkSize); i++) {
    const thisSize = (i + 1) * chunkSize < size ? chunkSize : size - i * chunkSize
    const data = crypto.randomBytes(thisSize)

    await new Promise((resolve, reject) => {
      stream.write(data, (error) => {
        if (error != null) {
          reject(error)
        } else {
          resolve(error)
        }
      })
    })
  }

  await new Promise(resolve => stream.end(resolve))
}

export const generateFiles = async function * (path: string, sizes: number[], options?: { chunkSize: number }): AsyncGenerator<() => Promise<{ path: string, size: number }>> {
  await fs.mkdir(path, { recursive: true })

  for (const size of sizes) {
    yield async () => {
      const dataFile = Path.join(path, `${prettyBytes(size)}.data`)

      await generateFile(dataFile, size, options)
      return { path: dataFile, size }
    }
  }
}

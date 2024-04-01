import crypto from 'crypto'
import fs from 'fs'

export default async (path: string, size: number, options?: { chunkSize: number }): Promise<void> => {
  const chunkSize = options?.chunkSize ?? 2 ** 14
  const stream = fs.createWriteStream(path)

  for (let i = 0; i < Math.ceil(size / chunkSize); i++) {
    const thisSize = (i + 1) * chunkSize < size ? chunkSize : size - i * chunkSize
    const data = crypto.randomBytes(thisSize)

    stream.write(data)
  }

  await new Promise(resolve => stream.end(resolve))
}

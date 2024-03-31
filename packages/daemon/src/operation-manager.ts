import * as cborg from 'cborg'
import { Key, type Datastore } from 'interface-datastore'
import all from 'it-all'
import Queue from 'p-queue'

type ArgumentTypes<F extends (...args: any[]) => any> = F extends (...args: infer A) => any ? A : never

type OperationMap <T extends Record<string, (...args: any[]) => any> = Record<string, (...args: any[]) => any>> = {
  [Property in keyof T]: T[Property]
}

type OperationTuples<T extends OperationMap = OperationMap> = {
  [K in keyof T]: [K, ArgumentTypes<T[K]>]
}[keyof T]

export class OperationManager <T extends OperationMap> {
  private readonly datastore: Datastore
  private readonly operations: T
  private readonly queue = new Queue({ concurrency: 1 })
  private logical = 0

  constructor (datastore: Datastore, operations: T) {
    this.datastore = datastore
    this.operations = operations
  }

  async start (): Promise<void> {
    const opData = await all(this.datastore.query({}))

    opData.sort((a, b) => Number(a.key.toString().replace('/', '')) - Number(b.key.toString().replace('/', '')))

    if (opData.length > 0) {
      this.logical = (Number(opData[opData.length - 1].key.toString().replace('/', ''))) + 1
    }

    const operations: Array<{ key: Key, value: OperationTuples<T> }> = opData.map(d => ({ key: d.key, value: cborg.decode(d.value) }))

    for (const { key, value: [method, params] } of operations) {
      await this.queue.add(async () => {
        await this.operations[method].apply(this, params)
        await this.datastore.delete(key)
      })
    }
  }

  async add <A extends keyof T> (method: A, params: ArgumentTypes<T[A]>): Promise<ReturnType<T[A]>> {
    const key = new Key(`${this.logical}`)
    this.logical++

    await this.datastore.put(key, cborg.encode([method, params]))

    return this.queue.add(async () => {
      const value = await this.operations[method](...params)

      await this.datastore.delete(key)

      return value
    })
  }
}

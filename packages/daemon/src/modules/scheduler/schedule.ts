import type { KeyvalueDB } from '@/interface.js'

export class Schedule {
  private readonly database: KeyvalueDB

  constructor (database: KeyvalueDB) {
    this.database = database
  }
}

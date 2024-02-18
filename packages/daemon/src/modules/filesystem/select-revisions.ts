import type { Entry } from './interface.js'
import type { Pair } from '@/interface.js'
import type { RevisionStrategies } from 'rpc-interfaces/zod'

const REVISIONS_PER_INTERVAL = 3
const MS_IN_DAY = 1000 * 60 * 60 * 24
const MS_IN_WEEK = MS_IN_DAY * 7
const MS_IN_FORTNIGHT = MS_IN_WEEK * 2
const MS_IN_MONTH = MS_IN_FORTNIGHT * 2

const roundTo = (timestamp: number, mod: number): number => {
  return timestamp - (timestamp % mod)
}

const dist = (a: number, b: number): number => Math.abs(a - b)

export default (revisions: Array<Pair<string, Entry>>, strategy: RevisionStrategies): Array<Pair<string, Entry>> => {
  if (strategy === 'none') {
    return []
  }

  if (strategy === 'all') {
    return revisions
  }

  if (strategy !== 'log') {
    throw new Error('unknow revision strategy')
  }

  // Get a list of target dates:
  const dates: number[] = [roundTo(Date.now(), MS_IN_DAY)]

  for (const interval of [MS_IN_DAY, MS_IN_WEEK, MS_IN_FORTNIGHT, MS_IN_MONTH]) {
    for (let i = 0; i < REVISIONS_PER_INTERVAL; i++) {
      dates.push(roundTo(dates[dates.length - 1], interval) - interval)
    }
  }

  const nonNullRevisions = revisions.filter(({ value }) => Boolean(value)) as Array<Pair<string, NonNullable<Entry>>>

  const getClosestRevision = (ts: number): Pair<string, Entry> => nonNullRevisions.reduce((p, c) => dist(ts, p.value.timestamp) < dist(ts, c.value.timestamp) ? p : c, nonNullRevisions[0])

  return [...new Set(dates.map(getClosestRevision))]
}

import type { Pair, EncodedEntry } from "./interface.js";

const REVISIONS_PER_INTERVAL = 3;
const MS_IN_DAY = 1000 * 60 * 60 * 24;
const MS_IN_WEEK = MS_IN_DAY * 7;
const MS_IN_FORTNIGHT = MS_IN_WEEK * 2;
const MS_IN_MONTH = MS_IN_FORTNIGHT * 2;

const roundTo = (timestamp: number, mod: number) => {
	return timestamp - (timestamp % mod);
};

const dist = (a: number, b: number) => Math.abs(a - b);

export default (revisions: Pair<string, EncodedEntry>[]): Pair<string, EncodedEntry>[] => {	
	// Get a list of target dates:
	const dates: number[] = [roundTo(Date.now(), MS_IN_DAY)];

	for (const interval of [MS_IN_DAY, MS_IN_WEEK, MS_IN_FORTNIGHT, MS_IN_MONTH]) {
		for (let i = 0; i < REVISIONS_PER_INTERVAL; i++) {
			dates.push(roundTo(dates[dates.length - 1], interval) - interval);
		}
	}

	const getClosestRevision = (ts: number) => revisions.reduce((p, c) => dist(ts, p.value.timestamp) < dist(ts, c.value.timestamp) ? p : c, revisions[0]);

	return [...new Set(dates.map(getClosestRevision))];;
};

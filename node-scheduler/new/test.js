const PriorityList = require("./PriorityList");
const Scheduler = require("./Scheduler");
const SlotTimer = require("./SlotTimer");
const FileIterator = require("./FileIterator");

const priorityList = new PriorityList();

priorityList.add("w", 1);
priorityList.add("x", 100);
priorityList.add("y", 10);
priorityList.add("z", 31);

//priorityList.debug();

//console.log(priorityList.getData());

const scheduler = new Scheduler(priorityList, console.log);

scheduler.update();
//scheduler.debug();

const slotTimer = new SlotTimer();

slotTimer.setSlots(50);

(async () => {
	for await (const a of slotTimer) {
		//console.log("Work");
	}
})();

(async () => {
	for (;;) {
		await slotTimer.nextSleep();
		//console.log("Sleep");
	}
})();

const fileIterator = new FileIterator("/home/saul/Projects/go-ipfs_v0.9.1_linux-amd64.tar.gz");

fileIterator.chunkify().then(async () => {
	for await (const chunk of fileIterator) {
		if (!chunk.done)
			console.log(chunk.value);
	}
});

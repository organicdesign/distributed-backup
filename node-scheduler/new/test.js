const PriorityList = require("./PriorityList");
const Scheduler = require("./Scheduler");
const SlotTimer = require("./SlotTimer");

const priorityList = new PriorityList();

priorityList.add("w", 1);
priorityList.add("x", 100);
priorityList.add("y", 10);
priorityList.add("z", 31);

priorityList.debug();

console.log(priorityList.getData());

const scheduler = new Scheduler(priorityList, console.log);

scheduler.update();
scheduler.debug();


console.log (
	scheduler.next(),
	scheduler.next(),
	scheduler.next()
);

const slotTimer = new SlotTimer(
	() => console.log("do something"),
	() => console.log("sleep")
);

slotTimer.setSlots(10);

slotTimer.start();

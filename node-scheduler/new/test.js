const PriorityList = require("./PriorityList");
const Scheduler = require("./Scheduler");

const priorityList = new PriorityList();

priorityList.add("w", 1);
priorityList.add("x", 100);
priorityList.add("y", 10);
priorityList.add("z", 31);

priorityList.debug();

const scheduler = new Scheduler(priorityList, console.log);

scheduler.update();
scheduler.debug();
scheduler.next();
scheduler.next();
scheduler.next();

for (const item of scheduler)
	console.log(item);

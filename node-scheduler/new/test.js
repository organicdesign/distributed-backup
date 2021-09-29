const PriorityList = require("./PriorityList");

const priorityList = new PriorityList();

priorityList.add("a", 1);
priorityList.add("b", 100);
priorityList.add("c", 10);
priorityList.add("d", 31);

priorityList.debug();

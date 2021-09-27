const Scheduler = require("./scheduler");

const scheduler = new Scheduler();

scheduler.setTarget("test-1", 10);
scheduler.setTarget("test-2", 100);
scheduler.setTarget("test-3", 0.1);

scheduler.start();

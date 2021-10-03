const Service = require("./classes/MultiplexingService");

const service = new Service("unixSocket", 100000, 262158);

service.start();

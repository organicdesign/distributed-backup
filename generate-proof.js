const crypto = require("crypto");
const fs = require("fs");

const Proof = require("./classes/Proof");

const hash = process.argv[2];
const data = fs.readFileSync("/dev/stdin");

const proof = Proof.create(data, hash);

console.log(proof);

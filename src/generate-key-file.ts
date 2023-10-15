import Path from "path";
import { generateMnemonic, generateKeyFile } from "./key-manager/utils.js";
import { projectPath } from "./utils.js";

const mnemonic = generateMnemonic();
const name = "my server";

await generateKeyFile(Path.join(projectPath, "./config/key.json"), mnemonic, name);

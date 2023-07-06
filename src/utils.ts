import Path from "path";
import { fileURLToPath } from "url";

export const srcPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), "..");

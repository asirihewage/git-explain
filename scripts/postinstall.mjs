import { resolve } from "node:path";
import { readFileSync } from "node:fs";

try {
  const local = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf-8"),
  );
  if (local.name === "git-explain" && local.version) {
    process.exit(0);
  }
} catch {
  // Not in the repo — show message
}

console.log("");
console.log("  Thank you for installing git-explain!");
console.log("  Developed by Asiri Hewage from Sri Lanka");
console.log("  Visit https://w3genesis.com/");
console.log("");

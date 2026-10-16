import { readFileSync } from "node:fs";
import { dbReady, storeSow } from "../src/lib/db";

async function main() {
  const ok = await dbReady();
  console.log("dbReady:", ok);
  if (!ok) process.exit(1);
  const sow = readFileSync("samples/sow.md", "utf8");
  const indexed = await storeSow("Tiger connectivity check", sow);
  console.log("indexed:", indexed);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

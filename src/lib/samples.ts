import { readFileSync } from "fs";
import { join } from "path";

export function loadSample(name: "sow" | "thread"): string {
  const file = name === "sow" ? "sow.md" : "thread.txt";
  return readFileSync(join(process.cwd(), "samples", file), "utf8");
}

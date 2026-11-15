import { existsSync } from "node:fs";
import { join } from "node:path";
import { verses } from "./verses";

export function getRecordings() {
  return verses.filter((verse) => existsSync(join(process.cwd(), "public", "narration", verse.id + ".mp3"))).map((verse) => verse.id);
}

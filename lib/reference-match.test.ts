import { describe, expect, it } from "vitest";
import { referenceChoices } from "./reference-match";
import { dailyMode, shiftDay } from "./progress";
import { spokenReference } from "./spoken-reference";

describe("Reference Match", () => {
  it("gives a saved passage one correct choice and three distinct alternatives", () => {
    const result = referenceChoices("John 17:16", ["john 17:16", "Psalm 23:1", "PSALM 23:1", "John 3:16", "John 11:35"], 1);
    expect(result).toHaveLength(4);
    expect(new Set(result)).toEqual(new Set(["John 17:16", "Psalm 23:1", "John 3:16", "John 11:35"]));
  });

  it("gives each rotating mode a day and repeats across a calendar boundary", () => {
    const days = Array.from({ length: 5 }, (_, index) => dailyMode(shiftDay("2026-12-30", index)));
    expect(new Set(days.slice(0, 4))).toEqual(new Set(["blanks", "ordering", "letters", "reference"]));
    expect(days[4]).toBe(days[0]);
  });

  it.each([
    ["John seventeen sixteen", "John 17:16"],
    ["John 17 16", "John 17:16"],
    ["John chapter seventeen verse sixteen", "John 17:16"],
    ["first John one nine", "1 John 1:9"],
    ["Psalm one hundred nineteen eleven", "Psalm 119:11"],
  ])("turns %s into a searchable reference", (transcript, expected) => {
    expect(spokenReference(transcript)).toBe(expected);
  });
});

import { describe, expect, it } from "vitest";
import { eventKey, eventXp, mergeProgress, progressStats, verseProgress, type PracticeEvent } from "./progress";

const verseId = "philippians-4-13";

function event(date: string, mode: PracticeEvent["mode"] = "spoken", isIndependent = false): PracticeEvent {
  const key: Omit<PracticeEvent, "id" | "isIndependent"> = { date, verseId, mode };
  return { ...key, id: eventKey(key), isIndependent };
}

describe("practice progress", () => {
  it("merges retries and preserves an independent upgrade without awarding XP twice", () => {
    const date = "2026-11-13";
    const retry = event(date);
    const independent = event(date, "spoken", true);
    const events = mergeProgress([retry], [retry, independent, retry]);
    expect(events).toEqual([independent]);
    expect(progressStats(events, date).xp).toBe(20);
  });

  it("requires spaced independent recall for mastery", () => {
    const first = event("2026-10-01", "spoken", true);
    expect(verseProgress([first], verseId, "2026-10-02").mastery).toBe("Strong");
    expect(verseProgress([first, event("2026-10-02", "blanks")], verseId, "2026-10-10").mastery).toBe("Familiar");
    const spaced = [first, event("2026-10-07", "spoken", true), event("2026-10-29", "spoken", true)];
    expect(verseProgress(spaced, verseId, "2026-10-29")).toEqual({ mastery: "Mastered", nextReview: "2026-11-12" });
  });

  it("counts practice days independently of readings and repeat activities", () => {
    const events = [
      event("2026-11-09"),
      event("2026-11-10", "read"),
      event("2026-11-11", "blanks"),
      event("2026-11-12"),
      event("2026-11-12", "blanks"),
    ];
    expect(progressStats(events, "2026-11-13")).toMatchObject({
      dailyStreak: 2,
      weeklyStreak: 1,
      weekDays: [true, false, true, true, false, false, false],
    });
  });
});


it("does not treat clean tile rounds as independent recall while retaining their XP", () => {
  const events = [event("2026-10-01", "blanks", true), event("2026-10-07", "ordering", true), event("2026-10-29", "letters", true)];
  expect(verseProgress(events, verseId, "2026-10-29").mastery).toBe("Familiar");
  expect(events.map(eventXp)).toEqual([20, 20, 20]);
});

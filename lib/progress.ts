import { findVerse, type Mode, type VerseId } from "./verses";

export type PracticeEvent = {
  id: string;
  verseId: VerseId;
  mode: Mode | "read";
  date: string;
  isIndependent: boolean;
};

export type Mastery = "New" | "Familiar" | "Strong" | "Mastered";

export function dayKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export function shiftDay(day: string, days: number) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function eventXp(event: PracticeEvent) {
  if (event.mode === "read") return 0;
  return event.isIndependent ? 20 : 10;
}

export function eventKey(event: Omit<PracticeEvent, "id" | "isIndependent">) {
  return [event.date, event.verseId, event.mode].join("/");
}

export function mergeProgress(previous: PracticeEvent[], incoming: PracticeEvent[]) {
  const byId = new Map(previous.map((event) => [event.id, event]));
  for (const event of incoming) {
    const existing = byId.get(event.id);
    if (!existing || event.isIndependent) byId.set(event.id, event);
  }

  return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
}

export function verseProgress(events: PracticeEvent[], id: VerseId, today: string) {
  const history = events.filter((event) => event.verseId === id && event.mode !== "read");
  const independentDays = [...new Set(history.filter((event) => event.mode === "spoken" && event.isIndependent).map((event) => event.date))].sort();
  const days = [...new Set(history.map((event) => event.date))].sort();
  const latest = days.at(-1);
  const lastIndependent = independentDays.at(-1);
  let mastery: Mastery = "New";

  if (latest) mastery = "Familiar";
  if (lastIndependent && shiftDay(lastIndependent, 7) >= today) mastery = "Strong";
  if (independentDays.length >= 3 && lastIndependent && shiftDay(independentDays[0], 21) <= lastIndependent) mastery = "Mastered";

  const reviewInterval = { New: 0, Familiar: 1, Strong: 3, Mastered: 14 }[mastery];
  return { mastery, nextReview: latest ? shiftDay(latest, reviewInterval) : undefined };
}

function weekStart(day: string) {
  const weekday = new Date(day + "T12:00:00Z").getUTCDay();
  return shiftDay(day, -((weekday + 6) % 7));
}

export function progressStats(events: PracticeEvent[], today: string) {
  const practice = events.filter((event) => event.mode !== "read" && event.date <= today && findVerse(event.verseId));
  const days = new Set(practice.map((event) => event.date));
  const week = weekStart(today);
  const weekDays = Array.from({ length: 7 }, (_, index) => days.has(shiftDay(week, index)));
  const qualifiedWeeks = new Set([...days].map(weekStart).filter((start) => (
    Array.from({ length: 7 }, (_, index) => days.has(shiftDay(start, index))).filter(Boolean).length >= 3
  )));
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let dailyStreak = 0;
  while (days.has(cursor)) {
    dailyStreak++;
    cursor = shiftDay(cursor, -1);
  }
  cursor = qualifiedWeeks.has(week) ? week : shiftDay(week, -7);
  let weeklyStreak = 0;
  while (qualifiedWeeks.has(cursor)) {
    weeklyStreak++;
    cursor = shiftDay(cursor, -7);
  }

  return { dailyStreak, weeklyStreak, weekDays, xp: practice.reduce((total, event) => total + eventXp(event), 0) };
}

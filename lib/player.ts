"use client";

import { useSyncExternalStore } from "react";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { dayKey, eventKey, mergeProgress, type PracticeEvent } from "./progress";

type Player = { playerKey: string; events: PracticeEvent[]; hasSound: boolean; today: string };
const storageKey = "meleko-player-v1";
const empty: Player = { playerKey: "", events: [], hasSound: true, today: "" };
let current = empty;
let hasLoaded = false;
let audio: AudioContext | undefined;
let retryAt: ReturnType<typeof setTimeout> | undefined;
let isSyncing = false;
let hasFetchedSnapshot = false;
const subscribers = new Set<() => void>();
const synced = new Map<string, boolean>();
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const snapshotProgress = makeFunctionReference<"query", { playerKey: string; paginationOpts: { cursor: string | null; numItems: number } }, { page: { event: PracticeEvent }[]; isDone: boolean; continueCursor: string }>("practice:snapshot");
const sync = makeFunctionReference<"mutation", { playerKey: string; events: PracticeEvent[] }, null>("practice:sync");

function generateKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function update(next: Player) {
  current = next;
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    /*
      Keep the in-memory session playable when storage is unavailable.
    */
  }
  for (const notify of subscribers) notify();
}

function readSavedPlayer() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null") as Player | null;
    if (saved?.playerKey && Array.isArray(saved.events)) return saved;
  } catch {
    /*
      A corrupted or inaccessible save starts a fresh local session.
    */
  }
}

function refreshDay() {
  const today = dayKey();
  if (current.today !== today) update({ ...current, today });
}

function onStorage(event: StorageEvent) {
  if (event.key !== storageKey) return;
  const saved = readSavedPlayer();
  if (!saved || saved.playerKey !== current.playerKey) return;
  const events = mergeProgress(current.events, saved.events);
  if (JSON.stringify(events) === JSON.stringify(current.events) && saved.hasSound === current.hasSound) return;
  current = { ...saved, events, today: dayKey() };
  for (const notify of subscribers) notify();
  void syncProgress();
}

async function syncProgress() {
  if (!convexUrl || isSyncing || !current.playerKey || !navigator.onLine) return;
  const pending = current.events.filter((event) => synced.get(event.id) !== event.isIndependent);
  if (!pending.length && hasFetchedSnapshot) return;
  clearTimeout(retryAt);
  retryAt = undefined;
  isSyncing = true;
  try {
    const client = new ConvexHttpClient(convexUrl);
    if (!hasFetchedSnapshot) {
      let cursor: string | null = null;
      let isDone = false;
      while (!isDone) {
        const page: { page: { event: PracticeEvent }[]; isDone: boolean; continueCursor: string } = await client.query(snapshotProgress, { playerKey: current.playerKey, paginationOpts: { cursor, numItems: 100 } });
        const events = page.page.map((item) => item.event);
        for (const event of events) synced.set(event.id, event.isIndependent);
        update({ ...current, events: mergeProgress(current.events, events) });
        cursor = page.continueCursor;
        isDone = page.isDone;
      }
      hasFetchedSnapshot = true;
    }
    for (let offset = 0; offset < pending.length; offset += 50) {
      const events = pending.slice(offset, offset + 50);
      await client.mutation(sync, { playerKey: current.playerKey, events });
      for (const event of events) synced.set(event.id, event.isIndependent);
    }
  } catch {
    retryAt = setTimeout(syncProgress, 30_000);
  } finally {
    isSyncing = false;
  }
  if (!retryAt) void syncProgress();
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  if (!hasLoaded) {
    hasLoaded = true;
    const saved = readSavedPlayer();
    update({ ...(saved ?? { ...empty, playerKey: generateKey() }), today: dayKey() });
    window.addEventListener("storage", onStorage);
    window.addEventListener("online", syncProgress);
    window.addEventListener("focus", refreshDay);
    setInterval(refreshDay, 60_000);
    void syncProgress();
  }
  return () => subscribers.delete(notify);
}

function snapshot() {
  return current;
}

function serverSnapshot() {
  return empty;
}

export function usePlayer() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export function recordPractice(verseId: PracticeEvent["verseId"], mode: PracticeEvent["mode"], isIndependent = false) {
  const date = dayKey();
  const existing = readSavedPlayer();
  const key = { date, verseId, mode };
  const event = { ...key, id: eventKey(key), isIndependent };
  const previous = existing?.playerKey === current.playerKey ? mergeProgress(current.events, existing.events) : current.events;
  const alreadyEarned = previous.find((item) => item.id === event.id);
  update({ ...current, today: date, events: mergeProgress(previous, [event]) });
  void syncProgress();
  return alreadyEarned;
}

export function toggleSound() {
  update({ ...current, hasSound: !current.hasSound });
}

export function playCue(isCorrect: boolean) {
  if (!current.hasSound) return;
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(() => {});
    const notes = isCorrect ? [523.25, 659.25, 783.99] : [329.63, 246.94];
    notes.forEach((frequency, index) => {
      const start = audio!.currentTime + index * 0.078;
      const oscillator = audio!.createOscillator();
      const gain = audio!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.19);
      oscillator.connect(gain).connect(audio!.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.2);
    });
  } catch {
    /*
      Feedback stays visible if the browser cannot play the cue.
    */
  }
}

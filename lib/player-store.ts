import { dayKey, eventKey, mergeProgress, shiftDay, type PracticeEvent } from "./progress";
import { findVerse, modes } from "./verses";

type Player = { playerKey: string; events: PracticeEvent[]; hasSound: boolean; today: string };
type ProgressPage = { page: { event: PracticeEvent }[]; isDone: boolean; continueCursor: string };
type Transport = {
  push: (playerKey: string, events: PracticeEvent[]) => Promise<{ rejectedIds: string[] } | null>;
  pull?: (playerKey: string, cursor: string | null) => Promise<ProgressPage>;
};

const guestKey = "meleko-player-v1";
const empty: Player = { playerKey: "", events: [], hasSound: true, today: "" };

function generateKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isUsableEvent(event: PracticeEvent, accountId: string | null) {
  if (!event || typeof event.verseId !== "string" || typeof event.isIndependent !== "boolean") return false;
  if (!findVerse(event.verseId) && !(accountId && /^personal:[a-z0-9]+$/.test(event.verseId))) return false;
  return (event.mode === "read" || modes.includes(event.mode))
    && typeof event.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(event.date)
    && event.date >= "2024-01-01" && !Number.isNaN(Date.parse(event.date)) && shiftDay(event.date, 0) === event.date
    && event.id === eventKey(event);
}

export function createPlayerStore(accountId: string | null, transport?: Transport) {
  const storageKey = accountId ? `meleko-player-account-v1:${accountId}` : guestKey;
  const subscribers = new Set<() => void>();
  const synced = new Map<string, boolean>();
  const rejected = new Set<string>();
  let current = empty;
  let generation = 0;
  let retryAt: ReturnType<typeof setTimeout> | undefined;
  let refreshInterval: ReturnType<typeof setInterval> | undefined;
  let isSyncing = false;
  let hasFetchedSnapshot = false;

  function readSavedPlayer() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null") as Player | null;
      if (saved && Array.isArray(saved.events) && (accountId ? saved.playerKey === accountId : /^[a-f0-9]{64}$/.test(saved.playerKey))) {
        return { ...saved, events: saved.events.filter((event) => isUsableEvent(event, accountId)) };
      }
    } catch {
      /*
        A corrupted or inaccessible save starts a fresh local session.
      */
    }
  }

  function update(next: Player) {
    if (JSON.stringify(next) === JSON.stringify(current)) return;
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

  function currentWithSaved() {
    const saved = readSavedPlayer();
    if (!saved || saved.playerKey !== current.playerKey) return current;
    const events = mergeProgress(current.events, saved.events).filter((event) => !rejected.has(event.id));
    return { ...current, events };
  }

  function refreshDay() {
    const today = dayKey();
    if (current.today !== today) update({ ...currentWithSaved(), today });
  }

  function onStorage(event: StorageEvent) {
    if (event.key !== storageKey) return;
    const saved = readSavedPlayer();
    if (!saved || saved.playerKey !== current.playerKey) return;
    update({ ...currentWithSaved(), hasSound: saved.hasSound, today: dayKey() });
    void syncProgress();
  }

  function markSynced(event: PracticeEvent) {
    synced.set(event.id, (synced.get(event.id) ?? false) || event.isIndependent);
  }

  function receive(events: PracticeEvent[]) {
    if (!subscribers.size) return;
    for (const event of events) {
      markSynced(event);
      rejected.delete(event.id);
    }
    const local = currentWithSaved();
    update({ ...local, events: mergeProgress(local.events, events) });
  }

  async function syncProgress() {
    if (!transport || !subscribers.size || isSyncing || !current.playerKey || !navigator.onLine) return;
    function getPending() {
      return current.events.filter((event) => !synced.has(event.id)
        || (event.isIndependent && !synced.get(event.id)));
    }
    if ((!transport.pull || hasFetchedSnapshot) && !getPending().length) return;
    const startedGeneration = generation;
    const playerKey = current.playerKey;
    clearTimeout(retryAt);
    retryAt = undefined;
    isSyncing = true;
    try {
      if (transport.pull && !hasFetchedSnapshot) {
        let cursor: string | null = null;
        let isDone = false;
        while (!isDone) {
          const page = await transport.pull(playerKey, cursor);
          if (startedGeneration !== generation) return;
          receive(page.page.map((item) => item.event));
          cursor = page.continueCursor;
          isDone = page.isDone;
        }
        hasFetchedSnapshot = true;
      }
      const pending = getPending();
      for (let offset = 0; offset < pending.length; offset += 50) {
        const batch = pending.slice(offset, offset + 50);
        const result = await transport.push(playerKey, batch);
        if (startedGeneration !== generation) return;
        if (!result) throw new Error("Progress session changed.");
        const rejectedIds = new Set(result.rejectedIds);
        for (const event of batch) {
          if (!rejectedIds.has(event.id)) markSynced(event);
          else if (!synced.has(event.id)) rejected.add(event.id);
        }
        if (rejectedIds.size) update(currentWithSaved());
      }
    } catch {
      if (startedGeneration === generation) retryAt = setTimeout(syncProgress, 30_000);
    } finally {
      if (startedGeneration === generation) isSyncing = false;
    }
    if (!retryAt && startedGeneration === generation) void syncProgress();
  }

  function subscribe(notify: () => void) {
    subscribers.add(notify);
    if (subscribers.size === 1) {
      const saved = readSavedPlayer();
      const player = current === empty ? saved ?? { ...empty, playerKey: accountId ?? generateKey() } : currentWithSaved();
      update({ ...player, today: dayKey() });
      window.addEventListener("storage", onStorage);
      window.addEventListener("online", syncProgress);
      window.addEventListener("focus", refreshDay);
      refreshInterval = setInterval(refreshDay, 60_000);
      void syncProgress();
    }
    return () => {
      subscribers.delete(notify);
      if (subscribers.size) return;
      generation++;
      isSyncing = false;
      clearTimeout(retryAt);
      clearInterval(refreshInterval);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("online", syncProgress);
      window.removeEventListener("focus", refreshDay);
    };
  }

  function recordPractice(verseId: PracticeEvent["verseId"], mode: PracticeEvent["mode"], isIndependent = false) {
    if (!subscribers.size) return;
    const date = dayKey();
    const key = { date, verseId, mode };
    const event = { ...key, id: eventKey(key), isIndependent };
    if (!isUsableEvent(event, accountId)) return;
    const local = currentWithSaved();
    const alreadyEarned = local.events.find((item) => item.id === event.id);
    rejected.delete(event.id);
    update({ ...local, today: date, events: mergeProgress(local.events, [event]) });
    void syncProgress();
    return alreadyEarned;
  }

  function toggleSound() {
    if (!subscribers.size) return;
    update({ ...currentWithSaved(), hasSound: !current.hasSound });
  }

  function snapshot() {
    return current;
  }

  return { snapshot, subscribe, receive, recordPractice, toggleSound };
}

export function serverSnapshot() {
  return empty;
}

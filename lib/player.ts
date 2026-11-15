"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { createPlayerStore, serverSnapshot } from "./player-store";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const guestClient = convexUrl ? new ConvexHttpClient(convexUrl) : undefined;
const guestStore = createPlayerStore(null, guestClient && {
  pull: (playerKey, cursor) => guestClient.query(api.practice.snapshot, {
    playerKey,
    paginationOpts: { cursor, numItems: 100 },
  }),
  push: async (playerKey, events) => {
    await guestClient.mutation(api.practice.sync, { playerKey, events });
    return { rejectedIds: [] };
  },
});

export const lockedPlayerStore: typeof guestStore = {
  snapshot: serverSnapshot,
  subscribe: () => () => {},
  receive: () => {},
  recordPractice: () => undefined,
  toggleSound: () => {},
};

export const PlayerContext = createContext(guestStore);
export { guestStore };

let audio: AudioContext | undefined;

export function usePlayer() {
  const store = useContext(PlayerContext);
  return useSyncExternalStore(store.subscribe, store.snapshot, serverSnapshot);
}

export function usePlayerActions() {
  const store = useContext(PlayerContext);
  return {
    recordPractice: store.recordPractice,
    toggleSound: store.toggleSound,
    playCue: (isCorrect: boolean) => {
      if (store.snapshot().hasSound) playCue(isCorrect);
    },
  };
}

function playCue(isCorrect: boolean) {
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

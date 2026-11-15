"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, Square } from "lucide-react";
import type { Verse } from "@/lib/verses";

let stopActivePlayback: (() => void) | undefined;
let activeOwner: object | undefined;

export function Listen({ verse, hasRecording }: { verse: Verse; hasRecording: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState("");
  const stopRef = useRef<(() => void) | null>(null);
  const owner = useRef({});

  useEffect(() => () => {
    stopRef.current?.();
    if (activeOwner === owner.current) {
      stopActivePlayback = undefined;
      activeOwner = undefined;
    }
  }, []);

  function stopPlayback() {
    stopRef.current?.();
    stopRef.current = null;
    if (activeOwner === owner.current) {
      stopActivePlayback = undefined;
      activeOwner = undefined;
    }
    setIsPlaying(false);
  }

  function speak() {
    if (!("speechSynthesis" in window)) {
      stopPlayback();
      setMessage("Audio is unavailable on this device.");
      return;
    }
    const speech = new SpeechSynthesisUtterance(verse.text);
    speech.lang = "en-US";
    speech.rate = 0.88;
    speech.onend = stopPlayback;
    speech.onerror = () => {
      stopPlayback();
      setMessage("Audio could not play. Try again.");
    };
    stopRef.current = () => {
      speech.onend = null;
      speech.onerror = null;
      speechSynthesis.cancel();
    };
    speechSynthesis.speak(speech);
  }

  function togglePlayback() {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    stopActivePlayback?.();
    stopActivePlayback = stopPlayback;
    activeOwner = owner.current;
    setMessage("");
    setIsPlaying(true);
    if (!hasRecording && !verse.narrationUrl) {
      speak();
      return;
    }
    const track = new Audio(verse.narrationUrl ?? `/narration/${verse.id}.mp3`);
    let isActive = true;
    stopRef.current = () => {
      isActive = false;
      track.onended = null;
      track.pause();
    };
    track.onended = stopPlayback;
    void track.play().catch(() => {
      if (isActive) speak();
    });
  }

  return <div className="listen">
    <button type="button" className="button button-soft button-small" onClick={togglePlayback} aria-label={`${isPlaying ? "Stop audio for" : "Listen to"} ${verse.reference}`}>
      {isPlaying ? <Square size={16} /> : <Volume2 size={17} />} {isPlaying ? "Stop" : "Listen"}
    </button>
    {message && <span className="audio-error" role="status">{message}</span>}
  </div>;
}

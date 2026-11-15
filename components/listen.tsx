"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, Square } from "lucide-react";
import type { Verse } from "@/lib/verses";

export function Listen({ verse, hasRecording }: { verse: Verse; hasRecording: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState("");
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopRef.current?.(), []);

  function speak() {
    if (!("speechSynthesis" in window)) {
      setIsPlaying(false);
      setMessage("Audio is unavailable on this device.");
      return;
    }
    const speech = new SpeechSynthesisUtterance(verse.text);
    speech.lang = "en-US";
    speech.rate = 0.88;
    speech.onend = () => setIsPlaying(false);
    speech.onerror = () => {
      setIsPlaying(false);
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
      stopRef.current?.();
      setIsPlaying(false);
      return;
    }
    setMessage("");
    setIsPlaying(true);
    if (!hasRecording) {
      speak();
      return;
    }
    const track = new Audio(`/narration/${verse.id}.mp3`);
    let isActive = true;
    stopRef.current = () => {
      isActive = false;
      track.pause();
    };
    track.onended = () => setIsPlaying(false);
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

"use client";

import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { spokenReference } from "@/lib/spoken-reference";

type Recognition = {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

export function VerseVoiceInput({ onReference, isDisabled }: { onReference: (reference: string) => void; isDisabled: boolean }) {
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef<Recognition | null>(null);
  const latestReferenceHandler = useRef(onReference);

  useEffect(() => {
    latestReferenceHandler.current = onReference;
  }, [onReference]);

  useEffect(() => () => {
    if (active.current) {
      active.current.onend = null;
      active.current.onresult = null;
      active.current.onerror = null;
      active.current.abort();
    }
  }, []);

  function start() {
    const browser = window as Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const SpeechRecognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage("Voice lookup is unavailable here. Type a reference such as John 17:16.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.onend = () => {
      active.current = null;
      setIsListening(false);
    };
    recognition.onerror = () => setMessage("Couldn’t hear a reference. Try again or type it.");
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) latestReferenceHandler.current(spokenReference(transcript));
    };
    try {
      setMessage("");
      recognition.start();
      active.current = recognition;
      setIsListening(true);
    } catch {
      setMessage("Couldn’t start the microphone. Type a reference or try again.");
    }
  }

  return <div>
    <button type="button" className="button button-soft" disabled={isDisabled || isListening} onClick={start}>
      <Mic size={17} aria-hidden="true" /> {isListening ? "Listening…" : "Say a reference"}
    </button>
    {message && <p role="status">{message}</p>}
  </div>;
}

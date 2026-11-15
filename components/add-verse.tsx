"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAction, useMutation, useQuery, useConvexAuth } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isLookupTranslation, translations } from "@/lib/translations";
import { makePersonalVerse } from "@/lib/verses";
import { Listen } from "./listen";
import { VerseVoiceInput } from "./verse-voice-input";

export function AddVerse() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return <p>Sign-in is unavailable until the service is configured.</p>;
  return <ConnectedAddVerse />;
}

function ConnectedAddVerse() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const find = useAction(api.scripture.lookup);
  const save = useMutation(api.collection.add);
  const [isOpen, setIsOpen] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [reference, setReference] = useState("");
  const [translation, setTranslation] = useState("KJV");
  const [text, setText] = useState("");
  const [sourceId, setSourceId] = useState<Id<"scripturePassages">>();
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const hasPreview = isOpen && isAuthenticated && sourceId !== undefined;
  const audio = useQuery(api.scripture.audio, hasPreview ? { sourceId } : "skip");

  function clearPreview() {
    setText("");
    setSourceId(undefined);
    setMessage("");
  }

  async function lookup(requestedReference: string) {
    if (isBusy) return;
    setReference(requestedReference);
    clearPreview();
    setIsBusy(true);
    try {
      const result = await find({ reference: requestedReference, translation });
      setReference(result.reference);
      setTranslation(result.translation);
      setText(result.text);
      setSourceId(result.sourceId);
    } catch (error) {
      setMessage(error instanceof ConvexError && typeof error.data === "string" ? error.data : "Couldn’t look up this passage. Try again.");
    } finally {
      setIsBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isManual && !sourceId) {
      await lookup(reference);
      return;
    }
    setIsBusy(true);
    setMessage("");
    try {
      await save({ reference, translation, text, sourceId });
      setReference("");
      clearPreview();
      setIsOpen(false);
      setMessage("Verse saved to your library.");
    } catch {
      setMessage("Couldn’t save your verse. Check the reference and text, then try again.");
    } finally {
      setIsBusy(false);
    }
  }

  return <div className="add-verse">
    <button type="button" className="button button-primary" disabled={isBusy} aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)}>{isOpen ? "Close" : "Add verse"}</button>
    {isOpen && (isLoading ? <p>Checking your account…</p> : !isAuthenticated ? <p><Link href="/account">Sign in</Link> to save verses to your collection.</p> : <form onSubmit={submit} className="add-verse-form">
      <label>How would you like to add it?
        <select disabled={isBusy} value={isManual ? "paste" : "lookup"} onChange={(event) => {
          setIsManual(event.target.value === "paste");
          setTranslation("KJV");
          clearPreview();
        }}>
          <option value="lookup">Look up a passage</option>
          <option value="paste">Paste my own text</option>
        </select>
      </label>
      <label>Reference
        <input required disabled={isBusy} maxLength={120} value={reference} onChange={(event) => {
          setReference(event.target.value);
          if (!isManual) clearPreview();
        }} placeholder="John 17:16" />
      </label>
      <label>Translation
        <select disabled={isBusy} value={translation} onChange={(event) => {
          setTranslation(event.target.value);
          if (!isManual) clearPreview();
        }}>
          {translations.filter(([code]) => isManual || isLookupTranslation(code)).map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}
        </select>
      </label>
      {!isManual && <>
        <div className="verse-lookup-actions">
          <button type="button" className="button button-soft" disabled={isBusy || !reference.trim()} onClick={() => lookup(reference)}>Find passage</button>
          <VerseVoiceInput isDisabled={isBusy} onReference={lookup} />
        </div>
        <p>Choose “Paste my own text” to add NKJV, NIV, NLT, NASB, or ESV.</p>
      </>}
      {(isManual || hasPreview) && <label>Verse text
        <textarea required disabled={isBusy} maxLength={6000} rows={4} value={text} readOnly={!isManual} onChange={(event) => setText(event.target.value)} placeholder="Paste your verse here" />
      </label>}
      {hasPreview && <div className="verse-lookup-actions">
        <Listen key={sourceId} hasRecording={false} verse={makePersonalVerse(sourceId, reference, translation, text, audio?.url)} />
        {audio?.isPreparing && <span role="status">Preparing narration…</span>}
      </div>}
      {isBusy && <p role="status">{text ? "Saving verse…" : "Looking up passage…"}</p>}
      {(isManual || hasPreview) && <button className="button button-primary" disabled={isBusy || !text.trim()} type="submit">Save verse</button>}
    </form>)}
    {message && <p role="status">{message}</p>}
  </div>;
}

"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { makeFunctionReference } from "convex/server";

const translations = [
  ["KJV", "King James Version"],
  ["WEB", "World English Bible"],
  ["ESV", "English Standard Version"],
  ["NASB", "New American Standard Bible"],
  ["NLT", "New Living Translation"],
  ["NIV", "New International Version"],
] as const;

const add = makeFunctionReference<"mutation", { reference: string; translation: string; text: string }, string>("collection:add");

export function AddVerse() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return <p>Sign-in is unavailable until the service is configured.</p>;
  return <ConnectedAddVerse />;
}

function ConnectedAddVerse() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const save = useMutation(add);
  const [isOpen, setIsOpen] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [reference, setReference] = useState("");
  const [translation, setTranslation] = useState("KJV");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function lookup() {
    setIsBusy(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ reference, translation });
      const response = await fetch(`/api/verse?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setReference(result.reference);
      setText(result.text);
      setMessage("Passage found. Review it before saving.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not look up this passage.");
    } finally { setIsBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setMessage("");
    try {
      await save({ reference, translation, text });
      setReference("");
      setText("");
      setIsOpen(false);
      setMessage("Verse saved to your library.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save your verse."); }
    finally { setIsBusy(false); }
  }

  return <div className="add-verse">
    <button type="button" className="button button-primary" disabled={isBusy} aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)}>{isOpen ? "Close" : "Add verse"}</button>
    {isOpen && (isLoading ? <p>Checking your account…</p> : !isAuthenticated ? <p><Link href="/account">Sign in</Link> to save verses to your collection.</p> : <form onSubmit={submit} className="add-verse-form">
      <label>How would you like to add it?<select disabled={isBusy} value={isManual ? "paste" : "lookup"} onChange={(event) => { setIsManual(event.target.value === "paste"); setText(""); setTranslation("KJV"); }}><option value="lookup">Look up a passage</option><option value="paste">Paste my own text</option></select></label>
      <label>Reference<input required disabled={isBusy} maxLength={120} value={reference} onChange={(event) => { setReference(event.target.value); if (!isManual) setText(""); }} placeholder="John 3:16-18" /></label>
      <label>Translation<select disabled={isBusy} value={translation} onChange={(event) => { setTranslation(event.target.value); if (!isManual) setText(""); }}>{(isManual ? translations : translations.slice(0, 2)).map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}</select></label>
      {!isManual && <button type="button" className="button button-soft" disabled={isBusy || !reference} onClick={lookup}>Find passage</button>}
      <label>Verse text<textarea required disabled={isBusy} maxLength={6000} rows={4} value={text} readOnly={!isManual} onChange={(event) => setText(event.target.value)} placeholder={isManual ? "Paste your verse here" : "Look up a passage to preview its text"} /></label>
      <button className="button button-primary" disabled={isBusy || !text} type="submit">Save verse</button>
    </form>)}
    {message && <p role="status">{message}</p>}
  </div>;
}

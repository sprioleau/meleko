"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, CaseSensitive, Clock3, Gamepad2, Mic, PanelsTopLeft, Puzzle } from "lucide-react";
import { Listen } from "./listen";
import { useCollection } from "@/lib/collection";
import { usePlayerActions } from "@/lib/player";
import { modeInfo, verses, type Mode, type Verse, type VerseId } from "@/lib/verses";

const icons = { blanks: Puzzle, ordering: PanelsTopLeft, letters: CaseSensitive, spoken: Mic, reference: Bookmark };
const prompts = {
  blanks: "Tap a word to fill the next blank. Tap a filled blank to take a word back.",
  ordering: "Tap the word tiles in the order they appear in the verse.",
  letters: "Use the initials to help you recall each word. Type the complete verse.",
  reference: "Read the passage, then choose its book, chapter, and verse.",
  spoken: "Recite the verse from memory, then review how the transcript compares. You can type the verse too.",
};

export function StartScreen({ mode, verseId, isLesson, recordings }: { mode: Mode; verseId?: string; isLesson: boolean; recordings: VerseId[] }) {
  const collection = useCollection();
  const requestedId = isLesson && mode !== "spoken" ? undefined : verseId;
  const verse = collection.verses.find((item) => item.id === requestedId) ?? (isLesson && mode === "spoken" && !requestedId ? verses[0] : undefined);
  if (requestedId && !verse) return <p>{collection.isLoading ? "Loading verse…" : "Verse not found in your collection."}</p>;
  const selection = verse ? [verse] : verses;
  const Icon = icons[mode];
  const query = new URLSearchParams({ mode });
  if (isLesson) query.set("lesson", "1");
  if (verse && (!isLesson || mode === "spoken")) query.set("verse", verse.id);

  return <div className="intro-wrap">
    <Link className="back-link" href={isLesson ? "/" : "/practice"}><ArrowLeft size={17} /> {isLesson ? "Today’s lesson" : "Practice"}</Link>
    <section className="intro-panel">
      <div className="intro-banner"><div className="intro-emblem"><Icon size={43} strokeWidth={1.7} /></div></div>
      <div className="intro-body">
        <p className="eyebrow"><Gamepad2 size={16} /> {isLesson ? "Today’s lesson" : modeInfo[mode].difficulty}</p>
        <h1>{modeInfo[mode].title}</h1>
        <p className="intro-lead">{prompts[mode]}</p>
        <div className="intro-meta">
          <span><BookOpen size={16} /> {selection.length} {selection.length === 1 ? "verse" : "verses"} · {selection.length === 1 ? selection[0].translation : "KJV"}</span>
          <span><Clock3 size={16} /> {selection.length === 1 ? "1 min" : "5 min"}</span>
        </div>
        {mode !== "spoken" && mode !== "reference" && <div className="intro-preview">
          <div className="verse-reference"><span>{selection[0].reference}</span><Listen verse={selection[0]} hasRecording={recordings.includes(selection[0].id)} /></div>
          <blockquote>{selection[0].text}</blockquote>
        </div>}
        {mode === "spoken" && verse && <p className="spoken-intro-reference">{verse.reference}</p>}
        <Link className="button button-primary intro-cta" href={`/play?${query}`}>Start game <ArrowRight size={19} /></Link>
        {mode === "reference" && verse && <Link className="button button-soft intro-cta" href="/play?mode=reference">Play all {verses.length} starter verses</Link>}
      </div>
    </section>
  </div>;
}

export function LearnScreen({ verseId, recordings, isLesson, lessonMode }: { verseId?: string; recordings: VerseId[]; isLesson: boolean; lessonMode: Mode }) {
  const router = useRouter();
  const { recordPractice } = usePlayerActions();
  const collection = useCollection();
  const verse = verseId ? collection.verses.find((item) => item.id === verseId) : verses[0];
  if (!verse) return <p>{collection.isLoading ? "Loading verse…" : "Verse not found in your collection."}</p>;
  const selectedVerse = verse;
  const hasRecording = recordings.includes(selectedVerse.id);

  function finishReading() {
    recordPractice(selectedVerse.id, "read");
    router.push(isLesson ? `/start?lesson=1&mode=${lessonMode}` : "/library");
  }

  return <div className="intro-wrap">
    <Link className="back-link" href={isLesson ? "/" : "/library"}><ArrowLeft size={17} /> {isLesson ? "Today’s lesson" : "Verse Library"}</Link>
    <section className="intro-panel">
      <div className="intro-banner"><div className="intro-emblem"><BookOpen size={43} strokeWidth={1.7} /></div></div>
      <div className="intro-body">
        <p className="eyebrow"><BookOpen size={16} /> Read and listen</p>
        <h1>{verse.reference}</h1>
        <p className="intro-lead">Read the verse slowly, then try saying it back.</p>
        <div className="intro-preview">
          <div className="verse-reference"><span>{verse.translation}</span><Listen verse={verse} hasRecording={hasRecording} /></div>
          <blockquote>{verse.text}</blockquote>
        </div>
        <button className="button button-primary intro-cta" type="button" onClick={finishReading}>{isLesson ? `Continue to ${modeInfo[lessonMode].title}` : "Mark as read"} <ArrowRight size={19} /></button>
      </div>
    </section>
  </div>;
}

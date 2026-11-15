import type { Metadata } from "next";
import { Game } from "@/components/game";
import { findMode, findVerse } from "@/lib/verses";
import { getRecordings } from "@/lib/recordings";

export const metadata: Metadata = { title: "Play" };

export default async function PlayPage({ searchParams }: { searchParams: Promise<{ mode?: string; verse?: string; lesson?: string }> }) {
  const query = await searchParams;
  const isLesson = query.lesson === "1";
  const mode = isLesson && query.mode !== "spoken" ? "blanks" : findMode(query.mode);
  const verseId = isLesson && mode === "blanks" ? undefined : findVerse(query.verse)?.id;
  return <Game key={`${mode}/${verseId}/${isLesson}`} {...{ mode, verseId, isLesson }} recordings={getRecordings()} />;
}

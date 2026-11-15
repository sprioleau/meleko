import type { Metadata } from "next";
import { LearnScreen } from "@/components/round-intro";
import { findVerse, verses } from "@/lib/verses";
import { getRecordings } from "@/lib/recordings";

export const metadata: Metadata = { title: "Read a Verse" };

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ verse?: string; lesson?: string }> }) {
  const query = await searchParams;
  const verse = findVerse(query.verse) ?? verses[0];
  return <LearnScreen verse={verse} isLesson={query.lesson === "1"} hasRecording={getRecordings().includes(verse.id)} />;
}

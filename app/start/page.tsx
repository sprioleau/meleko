import type { Metadata } from "next";
import { StartScreen } from "@/components/round-intro";
import { findMode } from "@/lib/verses";
import { getRecordings } from "@/lib/recordings";

export const metadata: Metadata = { title: "Start Practice" };

export default async function StartPage({ searchParams }: { searchParams: Promise<{ mode?: string; verse?: string; lesson?: string }> }) {
  const query = await searchParams;
  const isLesson = query.lesson === "1";
  return <StartScreen mode={isLesson && query.mode !== "spoken" ? "blanks" : findMode(query.mode)} verseId={query.verse} isLesson={isLesson} recordings={getRecordings()} />;
}

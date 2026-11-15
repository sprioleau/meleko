import type { Metadata } from "next";
import { LearnScreen } from "@/components/round-intro";
import { getRecordings } from "@/lib/recordings";

export const metadata: Metadata = { title: "Read a Verse" };

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ verse?: string; lesson?: string }> }) {
  const query = await searchParams;
  return <LearnScreen verseId={query.verse} isLesson={query.lesson === "1"} recordings={getRecordings()} />;
}

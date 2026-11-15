import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { About, Library, Practice, Progress } from "@/components/screens";
import { getRecordings } from "@/lib/recordings";

const pageTitles = { practice: "Practice", library: "Verse Library", progress: "Progress", about: "About" };
type Props = { params: Promise<{ section: string }> };

export function generateStaticParams() {
  return Object.keys(pageTitles).map((section) => ({ section }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  return { title: pageTitles[section as keyof typeof pageTitles] };
}

export default async function SectionPage({ params }: Props) {
  const { section } = await params;
  switch (section) {
    case "practice": return <Practice />;
    case "library": return <Library recordings={getRecordings()} />;
    case "progress": return <Progress />;
    case "about": return <About />;
    default: notFound();
  }
}

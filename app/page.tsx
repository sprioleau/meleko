import type { Metadata } from "next";
import { Home } from "@/components/screens";
import { getRecordings } from "@/lib/recordings";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function TodayPage() {
  return <Home recordings={getRecordings()} />;
}

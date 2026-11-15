import { Home } from "@/components/screens";
import { getRecordings } from "@/lib/recordings";

export default function TodayPage() {
  return <Home recordings={getRecordings()} />;
}

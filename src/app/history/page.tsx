import { HistoryView } from "@/components/HistoryView";

export const metadata = {
  title: "History — ScopeLock",
  description: "Past scope analyses saved in MongoDB Atlas.",
};

export default function HistoryPage() {
  return <HistoryView />;
}

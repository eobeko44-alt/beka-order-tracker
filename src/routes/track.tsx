import { createFileRoute } from "@tanstack/react-router";
import TrackOrderPage from "@/views/TrackOrderPage";

const TITLE = "تتبع طلبك | بيكا ستور BEKA STORE";
const DESCRIPTION = "اكتب رقم الطلب أو ID اللاعب وشوف فوراً إذا طلبك قيد المراجعة، تم الشحن، أو مرفوض.";

export const Route = createFileRoute("/track")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q = typeof search["q"] === "string" ? search["q"].slice(0, 60) : undefined;
    return q ? { q } : {};
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackRoute,
});

function TrackRoute() {
  const { q } = Route.useSearch();
  return <TrackOrderPage initialQuery={q ?? ""} />;
}

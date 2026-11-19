import { createFileRoute, useNavigate } from "@tanstack/react-router";
import StatusScreen from "@/components/StatusScreen";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "المفضلة | بيكا ستور BEKA STORE" },
      { name: "description", content: "الألعاب اللي حفظتها في بيكا ستور — قريباً." },
      { property: "og:title", content: "المفضلة | بيكا ستور BEKA STORE" },
      { property: "og:description", content: "الألعاب اللي حفظتها في بيكا ستور — قريباً." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const navigate = useNavigate();
  return (
    <StatusScreen
      title="المفضلة"
      description="الصفحة دي جاية قريباً إن شاء الله."
      actionLabel="العودة إلى الرئيسية"
      onAction={() => void navigate({ to: "/" })}
    />
  );
}

import { createFileRoute } from "@tanstack/react-router";
import AdminPage from "@/views/AdminPage";

export const Route = createFileRoute("/beko-admin-2026")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "لوحة الإدارة | بيكا ستور BEKA STORE" },
      { name: "description", content: "إدارة طلبات الشحن وأرقام الدفع في بيكا ستور." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "لوحة الإدارة | بيكا ستور BEKA STORE" },
      { property: "og:description", content: "إدارة طلبات الشحن وأرقام الدفع في بيكا ستور." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

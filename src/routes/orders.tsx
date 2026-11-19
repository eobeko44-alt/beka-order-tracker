import { createFileRoute } from "@tanstack/react-router";
import OrdersPage from "@/views/OrdersPage";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "طلباتي | بيكا ستور BEKA STORE" },
      { name: "description", content: "تابع حالة طلبات الشحن بتاعتك في بيكا ستور." },
      { property: "og:title", content: "طلباتي | بيكا ستور BEKA STORE" },
      { property: "og:description", content: "تابع حالة طلبات الشحن بتاعتك في بيكا ستور." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

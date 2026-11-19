import { createFileRoute } from "@tanstack/react-router";
import AccountPage from "@/views/AccountPage";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "حسابي | بيكا ستور BEKA STORE" },
      { name: "description", content: "سجل دخولك على بيكا ستور بقوقل أو رقم الهاتف أو الإيميل، أو كمل كضيف." },
      { property: "og:title", content: "حسابي | بيكا ستور BEKA STORE" },
      { property: "og:description", content: "سجل دخولك عشان تشوف طلباتك ومحفظتك في بيكا ستور." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

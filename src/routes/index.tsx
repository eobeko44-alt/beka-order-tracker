import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import HomePage from "@/views/HomePage";
import { catalogQueryOptions } from "@/lib/catalog";
import { publicReviewsQueryOptions } from "@/lib/reviews";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "بيكا ستور BEKA STORE — اشحن ألعابك في دقائق" },
      {
        name: "description",
        content:
          "اشحن ببجي موبايل، فري فاير، يلا لودو وفيزا أمريكية بسرعة وأمان. ادفع بفوري أو ماي كاشي وارفع الإشعار.",
      },
      { property: "og:title", content: "بيكا ستور BEKA STORE — اشحن ألعابك في دقائق" },
      {
        property: "og:description",
        content: "شحن سريع وآمن لكل الألعاب: ببجي، فري فاير، يلا لودو وفيزا أمريكية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(catalogQueryOptions),
      context.queryClient.ensureQueryData(publicReviewsQueryOptions),
    ]),
  component: Index,
});

function Index() {
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions);
  const { data: reviews } = useSuspenseQuery(publicReviewsQueryOptions);
  return <HomePage games={catalog.games} packages={catalog.packages} reviews={reviews} />;
}

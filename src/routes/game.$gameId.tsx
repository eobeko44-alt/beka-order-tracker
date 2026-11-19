import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import GamePage from "@/views/GamePage";
import StatusScreen from "@/components/StatusScreen";
import { catalogQueryOptions } from "@/lib/catalog";
import { STORE_NAME } from "@/lib/config";

export const Route = createFileRoute("/game/$gameId")({
  loader: async ({ context, params }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQueryOptions);
    const game = catalog.games.find((item) => item.id === params.gameId);
    if (!game) throw notFound();
    return { gameNameAr: game.name_ar, gameNameEn: game.name_en };
  },
  head: ({ loaderData }) => {
    const title = loaderData
      ? `شحن ${loaderData.gameNameAr} ${loaderData.gameNameEn} | ${STORE_NAME}`
      : STORE_NAME;
    const description = loaderData
      ? `اختار باقة ${loaderData.gameNameAr} المناسبة ليك وادفع بفوري أو ماي كاشي. شحن سريع وآمن من بيكا ستور.`
      : "اشحن ألعابك المفضلة من بيكا ستور.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: GameRoute,
  notFoundComponent: GameNotFound,
});

function GameRoute() {
  const { gameId } = Route.useParams();
  const { data: catalog } = useSuspenseQuery(catalogQueryOptions);
  const game = catalog.games.find((item) => item.id === gameId);
  if (!game) return <GameNotFound />;
  const packages = catalog.packages
    .filter((pkg) => pkg.game_id === game.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  return <GamePage game={game} packages={packages} paymentMethods={catalog.paymentMethods} />;
}

function GameNotFound() {
  const navigate = useNavigate();
  return (
    <StatusScreen
      title="اللعبة غير موجودة"
      description="ربما تم إيقافها أو الرابط غير صحيح."
      actionLabel="العودة إلى الألعاب"
      onAction={() => void navigate({ to: "/" })}
    />
  );
}

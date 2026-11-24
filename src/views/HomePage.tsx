import { useMemo, useState } from 'react';
import { IdCard, UserCircle, Zap, ShieldCheck, Clock, Quote, SearchCheck, ChevronLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import GameCard from '@/components/GameCard';
import SearchBar from '@/components/SearchBar';
import ServiceBanner from '@/components/ServiceBanner';
import WalletSection from '@/components/wallet/WalletSection';
import Testimonials from '@/components/reviews/Testimonials';
import { STORE_LOGO_URL, STORE_NAME } from '@/lib/config';
import type { Game, Package, PublicReviews } from '@/types';

interface HomePageProps {
  games: Game[];
  packages: Package[];
  reviews: PublicReviews;
}

const HERO_IMAGE_URL =
  'https://images.pexels.com/photos/7862518/pexels-photo-7862518.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

const GAME_POSTERS: Record<string, string> = {
  'pubg-mobile':
    'https://images.pexels.com/photos/3678428/pexels-photo-3678428.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'free-fire':
    'https://images.pexels.com/photos/30042214/pexels-photo-30042214.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  ludo:
    'https://images.pexels.com/photos/11646952/pexels-photo-11646952.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'us-visa':
    'https://images.pexels.com/photos/259200/pexels-photo-259200.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'mobile-legends':
    'https://images.pexels.com/photos/34179707/pexels-photo-34179707.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'call-of-duty':
    'https://images.pexels.com/photos/5697183/pexels-photo-5697183.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  fortnite:
    'https://images.pexels.com/photos/4293307/pexels-photo-4293307.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'clash-of-clans':
    'https://original.fontsinuse.com/fontsinuse.com/use-images/95/95495/95495.jpeg',
};

const FEATURED_GAME_IDS = ['pubg-mobile', 'free-fire', 'ludo', 'us-visa'];

const FALLBACK_POSTER =
  'https://images.pexels.com/photos/4293307/pexels-photo-4293307.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

const TRUST_BADGES = [
  { icon: Zap, label: 'شحن فوري', sub: 'في دقائق' },
  { icon: ShieldCheck, label: 'دفع آمن', sub: '100% مضمون' },
  { icon: Clock, label: 'متاح 24/7', sub: 'طوال الوقت' },
];

export default function HomePage({ games, packages, reviews }: HomePageProps) {
  const [query, setQuery] = useState('');

  const visibleGames = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return games;
    return games.filter(
      (game) =>
        game.name_ar.includes(term) || game.name_en.toLowerCase().includes(term)
    );
  }, [games, query]);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-brand-500/25">
        <img
          src={HERO_IMAGE_URL}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        {/* Decorative neon glows */}
        <div className="pointer-events-none absolute top-1/4 start-10 h-48 w-48 rounded-full bg-brand-600/20 blur-[5rem]" />
        <div className="pointer-events-none absolute bottom-1/4 end-10 h-48 w-48 rounded-full bg-electric-600/15 blur-[5rem]" />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 py-14 text-center sm:px-6 sm:py-20">
          <img
            src={STORE_LOGO_URL}
            alt={STORE_NAME}
            className="h-32 w-32 rounded-3xl object-cover shadow-[0_0_50px_rgba(139,47,255,0.5)] ring-1 ring-electric-400/60 animate-fade-up sm:h-44 sm:w-44"
          />
          <span className="animate-fade-up rounded-full border border-electric-400/50 bg-electric-400/10 px-5 py-1.5 text-xs font-bold text-electric-300 shadow-[0_0_20px_rgba(25,207,255,0.15)]" style={{ animationDelay: '0.1s' }}>
            شحن سريع وآمن لكل الألعاب
          </span>
          <h1 className="animate-fade-up text-3xl font-extrabold leading-tight text-zinc-50 sm:text-5xl" style={{ animationDelay: '0.2s' }}>
            اشحن ألعابك المفضلة
            <span className="block bg-gradient-to-l from-brand-300 via-electric-400 to-brand-300 bg-clip-text text-transparent">
              في دقائق معدودة
            </span>
          </h1>
          <p className="animate-fade-up max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base" style={{ animationDelay: '0.3s' }}>
            اختر لعبتك، والباقة التي تناسبك، وادفع بالطريقة الأسهل لك. بيكا ستور — وجهتك الأولى لشحن الألعاب.
          </p>

          {/* Store slogan */}
          <div
            className="animate-fade-up relative flex items-center gap-3 rounded-2xl border border-electric-400/30 bg-gradient-to-l from-brand-600/15 via-electric-500/10 to-brand-600/15 px-5 py-3 shadow-[0_0_30px_rgba(25,207,255,0.12)] backdrop-blur-sm sm:px-7 sm:py-3.5"
            style={{ animationDelay: '0.35s' }}
          >
            <span className="pointer-events-none absolute inset-y-0 start-0 w-1 rounded-s-2xl bg-gradient-to-b from-brand-400 to-electric-400" />
            <span className="pointer-events-none absolute inset-y-0 end-0 w-1 rounded-e-2xl bg-gradient-to-b from-electric-400 to-brand-400" />
            <Quote className="h-4 w-4 shrink-0 -scale-x-100 text-electric-400/80 sm:h-5 sm:w-5" />
            <p className="text-shimmer text-base font-extrabold leading-snug tracking-wide sm:text-xl">
              من قمة ماسك المنصة.. بيكا حقيقي ما دعاية!
            </p>
            <Quote className="h-4 w-4 shrink-0 text-brand-300/80 sm:h-5 sm:w-5" />
          </div>

          {/* Trust badges */}
          <div className="animate-fade-up flex flex-wrap items-center justify-center gap-3 pt-2 sm:gap-4" style={{ animationDelay: '0.4s' }}>
            {TRUST_BADGES.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.label}
                  className="flex items-center gap-2 rounded-xl border border-brand-500/20 bg-brand-500/5 px-3 py-2 backdrop-blur-sm"
                >
                  <Icon className="h-4 w-4 text-brand-300" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs font-bold text-zinc-100">{badge.label}</span>
                    <span className="text-[0.65rem] text-zinc-400">{badge.sub}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="animate-fade-up w-full pt-3" style={{ animationDelay: '0.5s' }}>
            <SearchBar value={query} onChange={setQuery} />
          </div>

          <Link
            to="/track"
            className="animate-fade-up group flex w-full items-center gap-3 rounded-2xl border border-electric-500/30 bg-electric-500/5 px-4 py-3 text-start transition-colors hover:border-electric-400 hover:bg-electric-500/10"
            style={{ animationDelay: '0.55s' }}
          >
            <SearchCheck className="h-5 w-5 shrink-0 text-electric-300" />
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="text-sm font-bold text-zinc-50">تتبع طلبك</span>
              <span className="text-xs text-zinc-400">اكتب رقم الطلب أو ID اللاعب وشوف حالته فوراً</span>
            </span>
            <ChevronLeft className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Service Banners: ID Top-up & Account Top-up */}
      <section className="mx-auto w-full max-w-6xl px-3 pt-8 sm:px-6 sm:pt-10">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <ServiceBanner
            icon={IdCard}
            title="الشحن بالـ ID"
            subtitle="أدخل ID حسابك واستلم الشحن فوراً"
            accentFrom="#8b2fff"
            accentTo="#53eaff"
            onClick={() => {
              const el = document.getElementById('games');
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
          <ServiceBanner
            icon={UserCircle}
            title="الشحن عبر الحساب"
            subtitle="اربط حسابك وشحنه بسهولة وأمان"
            accentFrom="#19cfff"
            accentTo="#8b2fff"
            onClick={() => {
              const el = document.getElementById('wallet');
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        </div>
      </section>

      {/* Wallet Section */}
      <div id="wallet" className="scroll-mt-20">
        <WalletSection />
      </div>

      {/* Featured Games — Compact Poster Cards */}
      <section id="games" className="mx-auto max-w-6xl scroll-mt-20 px-3 py-12 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-extrabold text-zinc-50 sm:text-2xl">الألعاب والخدمات</h2>
            <p className="text-sm text-zinc-400">اختر لعبتك أو خدمتك المفضلة</p>
          </div>
          <span className="text-sm text-zinc-500">{visibleGames.length} متاح</span>
        </div>

        {visibleGames.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 p-10 text-center text-zinc-400">
            لا توجد لعبة تطابق بحثك
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visibleGames.map((game) => {
              const gamePackages = packages.filter((pkg) => pkg.game_id === game.id);
              const prices = gamePackages.map((pkg) => pkg.price_sdg);
              return (
                <GameCard
                  key={game.id}
                  game={game}
                  packageCount={gamePackages.length}
                  startingPrice={prices.length ? Math.min(...prices) : null}
                  posterUrl={GAME_POSTERS[game.id] ?? FALLBACK_POSTER}
                  isFeatured={FEATURED_GAME_IDS.includes(game.id)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Customer reviews */}
      <Testimonials data={reviews} />
    </div>
  );
}
